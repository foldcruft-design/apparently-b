// Инициализация Telegram WebApp API
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

// Мок‑данные чатов (пока нет бэкенда)
const mockChats = [
  {
    id: 1,
    title: "Рабочий чат",
    type: "Группа",
    lastMessage: "Статистика за вчера загружена ✔",
    unread: 12
  },
  {
    id: 2,
    title: "Side‑project",
    type: "Супергруппа",
    lastMessage: "Новый коммит в репозиторий",
    unread: 3
  },
  {
    id: 3,
    title: "Личные заметки",
    type: "Личный",
    lastMessage: "Идеи по улучшению трекера...",
    unread: 0
  },
  {
    id: 4,
    title: "Семейный чат",
    type: "Группа",
    lastMessage: "Фото с поездки на выходных",
    unread: 7
  }
];

// Инициализация после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  initUserInfo();
  initTabs();
  renderChatList(mockChats);
  initSettings();
  initStats();
});

/**
 * Отображение информации о пользователе Telegram
 */
function initUserInfo() {
  const el = document.getElementById("user-info");
  if (!el) return;

  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    el.textContent = name || "Мой профиль";
  } else {
    el.textContent = "Гость";
  }
}

/**
 * Инициализация вкладок: верхние и нижние кнопки синхронно
 */
function initTabs() {
  const topButtons = document.querySelectorAll(".tab-top-btn");
  const bottomButtons = document.querySelectorAll(".bottom-btn");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(tabName) {
    contents.forEach((section) => {
      section.classList.toggle("active", section.id === `tab-${tabName}`);
    });

    topButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    bottomButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
  }

  topButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  bottomButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Стартовая вкладка
  activateTab("chats");
}

/**
 * Рендер списка чатов
 */
function renderChatList(chats) {
  const listEl = document.getElementById("chat-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  chats.forEach((chat) => {
    const card = document.createElement("div");
    card.className = "chat-card";
    card.dataset.chatId = chat.id;

    // Аватар
    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    avatar.textContent = chat.title.charAt(0).toUpperCase();

    // Информация
    const info = document.createElement("div");
    info.className = "chat-info";

    const titleRow = document.createElement("div");
    titleRow.className = "chat-title-row";

    const title = document.createElement("div");
    title.className = "chat-title";
    title.textContent = chat.title;

    const type = document.createElement("div");
    type.className = "chat-type";
    type.textContent = chat.type;

    titleRow.appendChild(title);
    titleRow.appendChild(type);

    const metaRow = document.createElement("div");
    metaRow.className = "chat-meta-row";

    const lastMessage = document.createElement("div");
    lastMessage.className = "chat-last-message";
    lastMessage.textContent = chat.lastMessage;

    const counter = document.createElement("div");
    counter.className = "chat-counter";
    counter.innerHTML = `<span>✉</span><span>${chat.unread}</span>`;

    metaRow.appendChild(lastMessage);
    metaRow.appendChild(counter);

    info.appendChild(titleRow);
    info.appendChild(metaRow);

    card.appendChild(avatar);
    card.appendChild(info);

    // Клик по карточке чата
    card.addEventListener("click", () => onChatClick(chat));

    listEl.appendChild(card);
  });
}

/**
 * Обработчик клика по чату
 * Здесь можно:
 *  - открыть подробную статистику по чату
 *  - отправить событие бэкенду
 *  - вызвать tg.sendData(...) для бота
 */
function onChatClick(chat) {
  if (tg) {
    // Передаём данные боту, если нужно
    tg.sendData(
      JSON.stringify({
        action: "open_chat_stats",
        chatId: chat.id
      })
    );
  }

  // Для UX переключим вкладку на "Статистика" и покажем данные по чату
  const topChatEl = document.getElementById("stats-top-chat");
  if (topChatEl) {
    topChatEl.textContent = chat.title;
  }

  // Активируем вкладку статистики
  const tabName = "stats";
  const contents = document.querySelectorAll(".tab-content");
  const topButtons = document.querySelectorAll(".tab-top-btn");
  const bottomButtons = document.querySelectorAll(".bottom-btn");

  contents.forEach((section) => {
    section.classList.toggle("active", section.id === `tab-${tabName}`);
  });
  topButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  bottomButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
}

/**
 * Инициализация настроек (пока просто логируем изменения)
 */
function initSettings() {
  const privateCheckbox = document.getElementById("setting-private");
  const groupCheckbox = document.getElementById("setting-group");

  if (privateCheckbox) {
    privateCheckbox.addEventListener("change", () => {
      console.log("Track private chats:", privateCheckbox.checked);
      // TODO: отправить настройку на сервер
    });
  }

  if (groupCheckbox) {
    groupCheckbox.addEventListener("change", () => {
      console.log("Track group chats:", groupCheckbox.checked);
      // TODO: отправить настройку на сервер
    });
  }
}

/**
 * Пример инициализации статистики
 * Пока просто считаем по мок‑данным
 */
function initStats() {
  const totalEl = document.getElementById("stats-total");
  const perMinuteEl = document.getElementById("stats-per-minute");

  const totalMessages = mockChats.reduce((sum, chat) => sum + chat.unread, 0);
  if (totalEl) {
    totalEl.textContent = totalMessages;
  }

  // Фейковая метрика "сообщений в минуту"
  const perMinute = (totalMessages / 60).toFixed(2);
  if (perMinuteEl) {
    perMinuteEl.textContent = perMinute;
  }
}