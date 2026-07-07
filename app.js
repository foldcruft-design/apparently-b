// app.js — логика Message Tracker Mini App

(function () {
  const tg = window.Telegram.WebApp;

  // Когда приложение готово
  tg.ready();
  tg.expand();

  // DOM-элементы
  const tabButtonsTop = document.querySelectorAll(".tab-top-btn");
  const tabSections = document.querySelectorAll(".tab-content");
  const bottomButtons = document.querySelectorAll(".bottom-btn");
  const modeButtons = document.querySelectorAll(".pill-button");

  const chatListEl = document.getElementById("chat-list");
  const eventsListEl = document.getElementById("events-list");
  const eventsStatusEl = document.getElementById("events-status");

  const statsTotalEl = document.getElementById("stats-total");
  const statsTopChatEl = document.getElementById("stats-top-chat");
  const statsPerMinuteEl = document.getElementById("stats-per-minute");

  const userInfoEl = document.getElementById("user-info");

  const refreshBtn = document.getElementById("refresh-btn");

  const settingPrivateEl = document.getElementById("setting-private");
  const settingGroupEl = document.getElementById("setting-group");
  const settingLiveEl = document.getElementById("setting-live");

  const commandPills = document.querySelectorAll(".command-pill");

  // Состояние
  let currentTab = "chats";
  let currentMode = "all";

  let chats = [];      // загруженные чаты
  let events = [];     // события удалений / изменений
  let stats = null;    // статистика

  let eventsPollingInterval = null;

  // ==========================
  // Инициализация пользователя
  // ==========================

  function initUserInfo() {
    try {
      const data = tg.initDataUnsafe;
      if (data && data.user) {
        const u = data.user;
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
        const username = u.username ? `@${u.username}` : "";
        userInfoEl.textContent = username || name || `id: ${u.id}`;
      } else {
        userInfoEl.textContent = "Гость";
      }
    } catch (e) {
      userInfoEl.textContent = "";
    }
  }

  // ==========================
  // Переключение вкладок
  // ==========================

  function setActiveTab(tabName) {
    currentTab = tabName;

    tabButtonsTop.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    bottomButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    tabSections.forEach((section) => {
      section.classList.toggle(
        "active",
        section.id === `tab-${tabName}`
      );
    });

    if (tabName === "chats") {
      renderChats();
    } else if (tabName === "events") {
      renderEvents();
    } else if (tabName === "stats") {
      renderStats();
    } else if (tabName === "settings") {
      // настройки сами по себе статичны, логика внутри кликов
    }
  }

  tabButtonsTop.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) setActiveTab(tab);
    });
  });

  bottomButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) setActiveTab(tab);
    });
  });

  // ==========================
  // Фильтры чатов
  // ==========================

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode || "all";
      currentMode = mode;

      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      renderChats();
    });
  });

  // ==========================
  // Рендер чатов
  // ==========================

  function renderChats() {
    chatListEl.innerHTML = "";

    if (!chats || chats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "section-subtitle";
      empty.style.margin = "10px 4px";
      empty.textContent = "Пока нет чатов, где трекер видит сообщения.";
      chatListEl.appendChild(empty);
      return;
    }

    const filtered = chats.filter((chat) => {
      if (currentMode === "private") {
        return chat.type === "private";
      }
      if (currentMode === "groups") {
        return chat.type === "group" || chat.type === "supergroup";
      }
      return true; // all
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "section-subtitle";
      empty.style.margin = "10px 4px";
      empty.textContent = "Нет чатов для выбранного фильтра.";
      chatListEl.appendChild(empty);
      return;
    }

    filtered.forEach((chat) => {
      const card = document.createElement("article");
      card.className = "chat-card";

      const avatar = document.createElement("div");
      avatar.className = "chat-avatar";
      avatar.textContent = getChatInitials(chat);

      const info = document.createElement("div");
      info.className = "chat-info";

      const titleRow = document.createElement("div");
      titleRow.className = "chat-title-row";

      const title = document.createElement("div");
      title.className = "chat-title";
      title.textContent = chat.title || chat.name || "Без названия";

      const type = document.createElement("div");
      type.className = "chat-type";
      type.textContent = formatChatType(chat.type);

      titleRow.appendChild(title);
      titleRow.appendChild(type);

      const metaRow = document.createElement("div");
      metaRow.className = "chat-meta-row";

      const lastMsg = document.createElement("div");
      lastMsg.className = "chat-last-message";
      lastMsg.textContent = chat.last_message || "Нет последних сообщений";

      const counter = document.createElement("div");
      counter.className = "chat-counter";

      const counterValue = document.createElement("span");
      counterValue.textContent = chat.delta || chat.total_today || 0;

      const counterLabel = document.createElement("span");
      counterLabel.textContent = "сообщения";

      counter.appendChild(counterValue);
      counter.appendChild(counterLabel);

      metaRow.appendChild(lastMsg);
      metaRow.appendChild(counter);

      info.appendChild(titleRow);
      info.appendChild(metaRow);

      card.appendChild(avatar);
      card.appendChild(info);

      card.addEventListener("click", () => {
        // При клике можно открыть подробную статистику по чату или отправить команду боту
        // Здесь просто отправим ID чата боту
        sendDataToBot({ action: "open_chat", chat_id: chat.id });
      });

      chatListEl.appendChild(card);
    });
  }

  function getChatInitials(chat) {
    const title = chat.title || chat.name || "";
    if (!title) return "MT";
    const words = title.trim().split(/s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (
      (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
    );
  }

  function formatChatType(type) {
    switch (type) {
      case "private":
        return "Личный чат";
      case "group":
        return "Группа";
      case "supergroup":
        return "Супергруппа";
      case "channel":
        return "Канал";
      default:
        return "Чат";
    }
  }

  // ==========================
  // Рендер событий
  // ==========================

  function renderEvents() {
    eventsListEl.innerHTML = "";

    if (!events || events.length === 0) {
      const empty = document.createElement("div");
      empty.className = "section-subtitle";
      empty.style.margin = "10px 4px";
      empty.textContent = "Пока нет удалённых или изменённых сообщений.";
      eventsListEl.appendChild(empty);
      return;
    }

    events.forEach((ev) => {
      const item = document.createElement("div");
      item.className = "event-item";

      const meta = document.createElement("div");
      meta.className = "event-meta";

      const userBlock = document.createElement("div");
      userBlock.className = "event-user";

      const avatar = document.createElement("img");
      avatar.className = "event-avatar";
      if (ev.user && ev.user.avatar_url) {
        avatar.src = ev.user.avatar_url;
      } else {
        avatar.src =
          "https://via.placeholder.com/32x32.png?text=U"; // заглушка
      }
      avatar.alt = "";

      const userInfo = document.createElement("div");
      userInfo.className = "event-user-info";

      const userName = document.createElement("span");
      userName.className = "event-user-name";
      userName.textContent =
        ev.user && (ev.user.name || ev.user.username)
          ? ev.user.name || ev.user.username
          : "Пользователь";

      const userId = document.createElement("span");
      userId.className = "event-user-id";
      userId.textContent =
        ev.user && ev.user.id ? `id: ${ev.user.id}` : "";

      userInfo.appendChild(userName);
      userInfo.appendChild(userId);

      userBlock.appendChild(avatar);
      userBlock.appendChild(userInfo);

      const time = document.createElement("span");
      time.className = "event-time";
      time.textContent = formatTime(ev.date);

      meta.appendChild(userBlock);
      meta.appendChild(time);

      const body = document.createElement("div");
      body.className = "event-body";

      const typeBadge = document.createElement("div");
      typeBadge.className = "event-type";

      if (ev.type === "deleted") {
        typeBadge.classList.add("deleted");
        typeBadge.textContent = "Удалено";
      } else if (ev.type === "edited") {
        typeBadge.classList.add("edited");
        typeBadge.textContent = "Изменено";
      } else {
        typeBadge.textContent = "Событие";
      }

      body.appendChild(typeBadge);

      if (ev.old_text) {
        const oldText = document.createElement("div");
        oldText.className = "event-text-old";
        oldText.textContent = `Было: ${ev.old_text}`;
        body.appendChild(oldText);
      }

      if (ev.new_text) {
        const newText = document.createElement("div");
        newText.className = "event-text-new";
        newText.textContent = `Стало: ${ev.new_text}`;
        body.appendChild(newText);
      }

      item.appendChild(meta);
      item.appendChild(body);

      eventsListEl.appendChild(item);
    });
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    const date =
      typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ==========================
  // Рендер статистики
  // ==========================

  function renderStats() {
    if (!stats) {
      statsTotalEl.textContent = "—";
      statsTopChatEl.textContent = "—";
      statsPerMinuteEl.textContent = "—";
      return;
    }

    statsTotalEl.textContent =
      typeof stats.total_today === "number"
        ? stats.total_today
        : "—";

    statsTopChatEl.textContent =
      stats.top_chat_title || "—";

    statsPerMinuteEl.textContent =
      typeof stats.per_minute === "number"
        ? stats.per_minute.toFixed(1)
        : "—";
  }

  // ==========================
  // Заглушки запросов к API
  // ==========================

  // В реальном приложении тут будут вызовы твоего бэкенда / бота.
  // Сейчас — моковые данные, чтобы UI работал.

  async function fetchChats() {
    // TODO: заменить на реальный запрос
    // пример: const res = await fetch("/api/chats"); chats = await res.json();
    chats = [
      {
        id: 1,
        title: "Личный чат с ботом",
        type: "private",
        last_message: "Добро пожаловать в Message Tracker!",
        total_today: 12,
      },
      {
        id: 2,
        title: "Рабочая группа",
        type: "group",
        last_message: "Обновлён список задач.",
        total_today: 54,
      },
      {
        id: 3,
        title: "Новости канала",
        type: "channel",
        last_message: "Новый пост опубликован.",
        total_today: 20,
      },
    ];
    renderChats();
  }

  async function fetchEvents() {
    // TODO: заменить на реальный запрос
    // пример: const res = await fetch("/api/events"); events = await res.json();
    events = [
      {
        type: "deleted",
        old_text: "Старое сообщение, которое удалили.",
        date: Date.now() / 1000 - 120,
        user: {
          id: 12345,
          name: "Иван",
          username: "ivan_dev",
          avatar_url:
            "https://via.placeholder.com/32x32.png?text=I",
        },
      },
      {
        type: "edited",
        old_text: "Было: опечатка в слове.",
        new_text: "Стало: исправленный текст.",
        date: Date.now() / 1000 - 30,
        user: {
          id: 67890,
          name: "Maria",
          username: "maria",
          avatar_url:
            "https://via.placeholder.com/32x32.png?text=M",
        },
      },
    ];
    renderEvents();
  }

  async function fetchStats() {
    // TODO: заменить на реальный запрос
    stats = {
      total_today: 86,
      top_chat_title: "Рабочая группа",
      per_minute: 0.7,
    };
    renderStats();
  }

  // ==========================
  // Пуллинг событий
  // ==========================

  function startEventsPolling() {
    if (eventsPollingInterval) return;

    eventsStatusEl.textContent = "Подключено";
    fetchEvents();

    eventsPollingInterval = setInterval(() => {
      // В реальном кейсе можно попросить только новые события
      fetchEvents();
    }, 10_000);
  }

  function stopEventsPolling() {
    if (eventsPollingInterval) {
      clearInterval(eventsPollingInterval);
      eventsPollingInterval = null;
    }
    eventsStatusEl.textContent = "Отключено";
  }

  // Тумблер "показывать события в реальном времени"
  settingLiveEl.addEventListener("change", () => {
    if (settingLiveEl.checked) {
      startEventsPolling();
    } else {
      stopEventsPolling();
    }
  });

  // ==========================
  // Обновление по кнопке
  // ==========================

  refreshBtn.addEventListener("click", () => {
    if (currentTab === "chats") {
      fetchChats();
    } else if (currentTab === "events") {
      fetchEvents();
    } else if (currentTab === "stats") {
      fetchStats();
    }
  });

  // ==========================
  // Команды бота
  // ==========================

  commandPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      const command = btn.dataset.command;
      if (!command) return;

      // Отправляем команду боту через sendData
      sendDataToBot({ action: "command", command });
    });
  });

  function sendDataToBot(payload) {
    try {
      const json = JSON.stringify(payload);
      tg.sendData(json);
      // Если не хочешь сразу закрывать апп, убери tg.close()
      // tg.close();
    } catch (e) {
      console.error("sendData error", e);
    }
  }

  // ==========================
  // Настройки фильтра отслеживания
  // ==========================

  settingPrivateEl.addEventListener("change", () => {
    sendDataToBot({
      action: "set_tracking",
      private: settingPrivateEl.checked,
      group: settingGroupEl.checked,
    });
  });

  settingGroupEl.addEventListener("change", () => {
    sendDataToBot({
      action: "set_tracking",
      private: settingPrivateEl.checked,
      group: settingGroupEl.checked,
    });
  });

  // ==========================
  // Старт приложения
  // ==========================

  function init() {
    initUserInfo();
    fetchChats();
    fetchStats();

    if (settingLiveEl.checked) {
      startEventsPolling();
    } else {
      stopEventsPolling();
    }

    setActiveTab("chats");
  }

  init();
})();