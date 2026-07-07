// app.js — Логика Message Tracker Mini App (3 вкладки: Чаты, Изменения, Команды)

(function () {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  if (tg) {
    tg.ready();
    tg.expand();
  }

  // ⚠️ Укажи реальный адрес своего бэкенд-сервера на Охостере
  const BACKEND_URL = "http://127.0.0.1:8000"; 

  // DOM-элементы навигации
  const bottomButtons = document.querySelectorAll(".bottom-btn");
  const tabSections = document.querySelectorAll(".tab-content");
  
  // DOM-элементы списков и контента
  const chatListEl = document.getElementById("chat-list");
  const logsContainerEl = document.getElementById("logs-container");
  const userInfoEl = document.getElementById("user-info");
  const refreshBtn = document.getElementById("refresh-btn");

  // Фильтры чатов (1 страница)
  const modeButtons = document.querySelectorAll(".pill-button");

  // Состояние приложения
  let currentTab = "chats"; // 'chats', 'logs', 'commands'
  let currentMode = "all";   // 'all', 'private', 'groups'
  
  let accountChats = [];
  let interceptedLogs = [];

  // ==========================================
  // 1. Инициализация и Профиль пользователя
  // ==========================================

  function initUserInfo() {
    if (!userInfoEl) return;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
      const username = u.username ? `@${u.username}` : "";
      userInfoEl.textContent = username || name || `ID: ${u.id}`;
    } else {
      userInfoEl.textContent = "Режим отладки";
    }
  }

  // ==========================================
  // 2. Управление вкладками (3 Главных Страницы)
  // ==========================================

  function setActiveTab(tabName) {
    currentTab = tabName;

    // Переключаем активные классы на кнопках меню
    bottomButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Показываем/скрываем контейнеры страниц
    tabSections.forEach((section) => {
      section.classList.toggle("active", section.id === `tab-${tabName}`);
    });

    // Загружаем актуальные данные в зависимости от открытой страницы
    if (tabName === "chats") {
      loadAccountChats();
    } else if (tabName === "logs") {
      loadInterceptedLogs();
    }
  }

  bottomButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) setActiveTab(tab);
    });
  });

  // Фильтрация чатов на 1-й странице
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentMode = btn.dataset.mode || "all";
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderChats();
    });
  });

  // ==========================================
  // 3. Страница 1: Получение и Рендер всех чатов
  // ==========================================

  async function loadAccountChats() {
    if (!chatListEl) return;
    chatListEl.innerHTML = "<div class='loading-box' style='text-align:center; padding:20px; color:var(--text-muted);'>Загрузка диалогов аккаунта...</div>";

    const initData = tg ? tg.initData : "";

    try {
      const response = await fetch(`${BACKEND_URL}/api/get_all_chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initData })
      });
      const result = await response.json();

      if (result.success && result.chats) {
        accountChats = result.chats;
        renderChats();
      } else {
        showError(chatListEl, result.error || "Ошибка загрузки списка.");
      }
    } catch (err) {
      console.error("Ошибка при работе с API (Страница 1):", err);
      showError(chatListEl, "Не удалось связаться с сервером.");
    }
  }

  function renderChats() {
    chatListEl.innerHTML = "";

    if (!accountChats || accountChats.length === 0) {
      chatListEl.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Диалоги не найдены.</div>";
      return;
    }

    // Фильтруем массив перед выводом
    const filtered = accountChats.filter((chat) => {
      if (currentMode === "private") return chat.type?.toLowerCase() === "private" || chat.id > 0;
      if (currentMode === "groups") return chat.type?.toLowerCase() === "group" || chat.type?.toLowerCase() === "supergroup" || chat.id < 0;
      return true;
    });

    if (filtered.length === 0) {
      chatListEl.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Нет чатов по выбранному фильтру.</div>";
      return;
    }

    filtered.forEach((chat) => {
      const card = document.createElement("article");
      card.className = "chat-card";

      const initials = chat.title ? chat.title.trim().charAt(0).toUpperCase() : "📱";

      card.innerHTML = `
        <div class="chat-avatar">${initials}</div>
        <div class="chat-info">
          <div class="chat-title-row">
            <div class="chat-title">${chat.title || "Без названия"}</div>
            <div class="chat-type">${formatChatType(chat.type)}</div>
          </div>
          <div class="chat-meta-row">
            <div class="chat-last-message">${chat.lastMessage || "Сообщений нет"}</div>
            ${chat.unread > 0 ? `<div class="chat-counter"><span>✉</span> <span>${chat.unread}</span></div>` : ""}
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        sendDataToBot({ action: "open_chat", chat_id: chat.id, title: chat.title });
      });

      chatListEl.appendChild(card);
    });
  }

  // ==========================================
  // 4. Страница 2: Измененные и Удаленные
  // ==========================================

  async function loadInterceptedLogs() {
    if (!logsContainerEl) return;
    logsContainerEl.innerHTML = "<div class='loading-box' style='text-align:center; padding:20px; color:var(--text-muted);'>Загрузка истории логов...</div>";

    const initData = tg ? tg.initData : "";

    try {
      const response = await fetch(`${BACKEND_URL}/api/get_logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initData })
      });
      const result = await response.json();

      if (result.success && result.logs) {
        interceptedLogs = result.logs;
        renderLogs();
      } else {
        showError(logsContainerEl, result.error || "Не удалось загрузить перехваты.");
      }
    } catch (err) {
      console.error("Ошибка при работе с API (Страница 2):", err);
      showError(logsContainerEl, "Сервер логов недоступен.");
    }
  }

  function renderLogs() {
    logsContainerEl.innerHTML = "";

    if (!interceptedLogs || interceptedLogs.length === 0) {
      logsContainerEl.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Удаленные или измененные сообщения не зафиксированы.</div>";
      return;
    }

    interceptedLogs.forEach((log) => {
      const card = document.createElement("div");
      card.className = "stats-card"; // Применяем готовый красивый стиль карточек

      const isDeleted = log.type === "deleted";
      const badgeColor = isDeleted ? "var(--danger)" : "var(--accent)";
      const badgeText = isDeleted ? "Удалено" : "Изменено";

      let textBlock = "";
      if (isDeleted) {
        textBlock = `<div style="color: var(--text-main); font-size: 14px; margin-top: 5px;">${log.text_before || "[Медиафайл]"}</div>`;
      } else {
        textBlock = `
          <div style="text-decoration: line-through; color: var(--text-muted); font-size: 12px; margin-top: 4px;">Было: ${log.text_before}</div>
          <div style="color: var(--accent-strong); font-weight: 500; font-size: 14px; margin-top: 2px;">Стало: ${log.text_after}</div>
        `;
      }

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
          <h3 style="margin:0; font-size:15px; font-weight:600;">${log.chat_title}</h3>
          <span style="background:${badgeColor}; color:#000; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase;">${badgeText}</span>
        </div>
        <p class="stats-label" style="margin:0; font-size:12px;">Отправитель: <b>${log.sender || "Неизвестный"}</b></p>
        ${textBlock}
      `;

      logsContainerEl.appendChild(card);
    });
  }

  // ==========================================
  // 5. Вспомогательные Инструменты и Команды
  // ==========================================

  // Привязка слушателей к кнопкам на 3 странице (Команды)
  const commandPills = document.querySelectorAll(".command-pill");
  commandPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      const command = btn.dataset.command;
      if (command) {
        sendDataToBot({ action: "execute_command", command: command });
      }
    });
  });

  // Кнопка принудительного обновления сверху (Зависит от выбранной вкладки)
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (currentTab === "chats") loadAccountChats();
      else if (currentTab === "logs") loadInterceptedLogs();
    });
  }

  function sendDataToBot(payload) {
    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload));
      } catch (e) {
        console.error("Ошибка метода sendData:", e);
      }
    } else {
      console.log("Данные отправлены в бота (эмуляция):", payload);
    }
  }

  function formatChatType(type) {
    if (!type) return "Чат";
    switch (type.toLowerCase()) {
      case "private": return "Личный";
      case "group": return "Группа";
      case "supergroup": return "Супергруппа";
      case "channel": return "Канал";
      default: return "Диалог";
    }
  }

  function showError(container, message) {
    container.innerHTML = `<div style='text-align:center; padding:20px; color:var(--danger); font-size:13px;'>❌ ${message}</div>`;
  }

  // Запуск логики при загрузке
  function init() {
    initUserInfo();
    setActiveTab("chats"); // Стартуем сразу с первой страницы чатов
  }

  init();
})();
