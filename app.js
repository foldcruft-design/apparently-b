/* =========================================================
   CONFIG
========================================================= */

const API_BASE = "/api";


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
    currentPage: "dashboard",
    selectedDuration: "60",
    loggedIn: false,
    channels: [],
    bannedUsers: [],
    tickets: [],
    admins: [],
    activities: []
};


/* =========================================================
   DOM
========================================================= */

const $ = (selector) => {
    return document.querySelector(selector);
};

const $$ = (selector) => {
    return document.querySelectorAll(selector);
};


/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen = $("#loginScreen");
const app = $("#app");

const loginForm = $("#loginForm");
const passwordInput = $("#password");

const passwordToggle = $("#passwordToggle");
const eyeOpen = $("#eyeOpen");
const eyeClosed = $("#eyeClosed");

const loginError = $("#loginError");
const loginButton = $("#loginButton");

const logoutButton = $("#logoutButton");

const modalOverlay = $("#modalOverlay");
const modalClose = $("#modalClose");
const modalContent = $("#modalContent");

const toastContainer = $("#toastContainer");

const pageTitle = $("#pageTitle");
const pageSubtitle = $("#pageSubtitle");


/* =========================================================
   API
========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const config = {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    };

    try {

        const response = await fetch(
            `${API_BASE}${endpoint}`,
            config
        );

        if (
            response.status === 401 &&
            endpoint !== "/login"
        ) {

            handleLogout(false);

            throw new Error(
                "Сессия закончилась"
            );
        }

        let data = null;

        const contentType =
            response.headers.get(
                "content-type"
            );

        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {
            data = await response.json();
        }

        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                `Ошибка API: ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error(
            "API error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   AUTH
========================================================= */

async function login(password) {

    setLoginLoading(true);

    hideLoginError();

    try {

        await apiRequest(
            "/login",
            {
                method: "POST",

                body: JSON.stringify({
                    password: password
                })
            }
        );

        state.loggedIn = true;

        showApplication();

        await loadDashboard();

        showToast(
            "Вы успешно вошли в панель",
            "success"
        );

    } catch (error) {

        showLoginError(
            "Неверный пароль или сервер недоступен"
        );

    } finally {

        setLoginLoading(false);
    }
}


async function checkSession() {

    try {

        await apiRequest(
            "/me"
        );

        state.loggedIn = true;

        showApplication();

        await loadDashboard();

    } catch {

        state.loggedIn = false;

        showLoginScreen();
    }
}


async function logoutRequest() {

    try {

        await apiRequest(
            "/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            error
        );
    }
}


function handleLogout(
    requestServer = true
) {

    if (requestServer) {
        logoutRequest();
    }

    state.loggedIn = false;

    app.classList.add("hidden");

    loginScreen.classList.remove(
        "hidden"
    );

    passwordInput.value = "";
}


/* =========================================================
   LOGIN UI
========================================================= */

function setLoginLoading(
    loading
) {

    loginButton.disabled = loading;

    if (loading) {

        loginButton.innerHTML =
            "<span>Проверка...</span>";

    } else {

        loginButton.innerHTML =
            "<span>Войти в панель</span>" +
            "<span class='button-arrow'>→</span>";
    }
}


function showLoginError(
    text
) {

    loginError.textContent = text;

    loginError.classList.remove(
        "hidden"
    );
}


function hideLoginError() {

    loginError.classList.add(
        "hidden"
    );
}


function showLoginScreen() {

    app.classList.add(
        "hidden"
    );

    loginScreen.classList.remove(
        "hidden"
    );
}


function showApplication() {

    loginScreen.classList.add(
        "hidden"
    );

    app.classList.remove(
        "hidden"
    );
}


/* =========================================================
   PASSWORD EYE
========================================================= */

passwordToggle.addEventListener(
    "click",
    () => {

        const isPassword =
            passwordInput.type ===
            "password";

        if (isPassword) {

            passwordInput.type =
                "text";

            eyeOpen.classList.add(
                "hidden"
            );

            eyeClosed.classList.remove(
                "hidden"
            );

            passwordToggle.setAttribute(
                "aria-label",
                "Скрыть пароль"
            );

        } else {

            passwordInput.type =
                "password";

            eyeOpen.classList.remove(
                "hidden"
            );

            eyeClosed.classList.add(
                "hidden"
            );

            passwordToggle.setAttribute(
                "aria-label",
                "Показать пароль"
            );
        }
    }
);


/* =========================================================
   LOGIN FORM
========================================================= */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const password =
            passwordInput.value.trim();

        if (!password) {

            showLoginError(
                "Введите пароль"
            );

            return;
        }

        await login(password);
    }
);


/* =========================================================
   NAVIGATION
========================================================= */

const pageData = {

    dashboard: {
        title: "Главная",
        subtitle:
            "Обзор состояния вашего бота"
    },

    channels: {
        title: "Каналы",
        subtitle:
            "Управление подключенными каналами"
    },

    users: {
        title: "Пользователи",
        subtitle:
            "Управление блокировками"
    },

    tickets: {
        title: "Обращения",
        subtitle:
            "Жалобы и сообщения пользователей"
    },

    ads: {
        title: "Реклама",
        subtitle:
            "Публикация рекламных постов"
    },

    admins: {
        title: "Администраторы",
        subtitle:
            "Управление доступом"
    },

    settings: {
        title: "Настройки",
        subtitle:
            "Конфигурация панели"
    }

};


function switchPage(
    page
) {

    if (!pageData[page]) {
        return;
    }

    state.currentPage = page;

    $$(".nav-item").forEach(
        (button) => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        }
    );

    $$(".page").forEach(
        (element) => {

            element.classList.toggle(
                "active",
                element.id ===
                `page-${page}`
            );
        }
    );

    pageTitle.textContent =
        pageData[page].title;

    pageSubtitle.textContent =
        pageData[page].subtitle;

    loadPageData(page);

    closeMobileSidebar();
}


$$(".nav-item").forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                switchPage(
                    button.dataset.page
                );
            }
        );
    }
);


$$(".quick-action").forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                switchPage(
                    button.dataset.pageTarget
                );
            }
        );
    }
);


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const mobileMenu =
    $("#mobileMenu");

mobileMenu.addEventListener(
    "click",
    () => {

        $(".sidebar").classList.toggle(
            "open"
        );
    }
);


function closeMobileSidebar() {

    $(".sidebar").classList.remove(
        "open"
    );
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiRequest(
                "/dashboard"
            );

        updateStats(data);

        if (data.activities) {

            state.activities =
                data.activities;

            renderActivities();
        }

    } catch (error) {

        console.error(
            "Dashboard:",
            error
        );

        /*
         * Пока API не подключён,
         * интерфейс остаётся рабочим.
         */
    }
}


function updateStats(
    data = {}
) {

    $("#statBanned").textContent =
        data.banned_users ?? 0;

    $("#statChannels").textContent =
        data.channels ?? 0;

    $("#statTickets").textContent =
        data.tickets ?? 0;

    $("#statAds").textContent =
        data.ads ?? 0;

    $("#ticketBadge").textContent =
        data.tickets ?? 0;
}


/* =========================================================
   ACTIVITIES
========================================================= */

function renderActivities() {

    const container =
        $("#activityList");

    if (
        !state.activities.length
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <span>◇</span>
                <p>Нет последних действий</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.activities
            .slice(0, 10)
            .map(
                (item) => `

                <div class="activity-item">

                    <span class="activity-dot"></span>

                    <span class="activity-text">
                        ${escapeHtml(
                            item.text ||
                            "Действие"
                        )}
                    </span>

                    <span class="activity-time">
                        ${escapeHtml(
                            item.time ||
                            ""
                        )}
                    </span>

                </div>
            `
            )
            .join("");
}


$("#refreshActivity")
    .addEventListener(
        "click",
        async () => {

            await loadDashboard();

            showToast(
                "Данные обновлены",
                "success"
            );
        }
    );


/* =========================================================
   CHANNELS
========================================================= */

async function loadChannels() {

    try {

        const data =
            await apiRequest(
                "/channels"
            );

        state.channels =
            data.channels || data || [];

        renderChannels();

    } catch (error) {

        console.error(
            "Channels:",
            error
        );
    }
}


function renderChannels() {

    const container =
        $("#channelsList");

    if (
        !state.channels.length
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <span>◈</span>
                <p>Нет подключенных каналов</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.channels
            .map(
                (channel) => `

                <div class="table-row">

                    <div class="table-title">
                        ${escapeHtml(
                            channel.title ||
                            "Без названия"
                        )}
                    </div>

                    <div class="table-id">
                        ${escapeHtml(
                            String(
                                channel.id ?? ""
                            )
                        )}
                    </div>

                    <div>
                        <span class="system-ok">
                            Активен
                        </span>
                    </div>

                    <div class="table-actions">

                        <button
                            class="small-button danger"
                            onclick="removeChannel(
                                '${escapeAttribute(
                                    channel.id
                                )}'
                            )"
                        >
                            Удалить
                        </button>

                    </div>

                </div>
            `
            )
            .join("");
}


$("#addChannelButton")
    .addEventListener(
        "click",
        openAddChannelModal
    );


function openAddChannelModal() {

    openModal(`

        <h2>Добавить канал</h2>

        <p class="modal-description">
            Укажите числовой Telegram ID канала.
        </p>

        <div class="modal-form">

            <input
                id="modalChannelId"
                type="number"
                placeholder="-100123456789"
            >

            <button
                class="primary-button"
                id="confirmAddChannel"
            >
                Добавить канал
            </button>

        </div>
    `);

    $("#confirmAddChannel")
        .addEventListener(
            "click",
            addChannel
        );
}


async function addChannel() {

    const input =
        $("#modalChannelId");

    const channelId =
        input.value.trim();

    if (!channelId) {

        showToast(
            "Введите ID канала",
            "error"
        );

        return;
    }

    try {

        await apiRequest(
            "/channels",
            {
                method: "POST",

                body: JSON.stringify({
                    channel_id:
                        Number(channelId)
                })
            }
        );

        closeModal();

        await loadChannels();

        await loadDashboard();

        showToast(
            "Канал добавлен",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


async function removeChannel(
    channelId
) {

    if (
        !confirm(
            "Удалить этот канал?"
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/channels/${encodeURIComponent(
                channelId
            )}`,
            {
                method: "DELETE"
            }
        );

        await loadChannels();

        await loadDashboard();

        showToast(
            "Канал удалён",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   BANNED USERS
========================================================= */

async function loadUsers() {

    try {

        const data =
            await apiRequest(
                "/users/banned"
            );

        state.bannedUsers =
            data.users ||
            data ||
            [];

        renderBannedUsers();

    } catch (error) {

        console.error(
            "Users:",
            error
        );
    }
}


function renderBannedUsers() {

    const container =
        $("#bannedUsersList");

    if (
        !state.bannedUsers.length
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <span>♙</span>
                <p>Нет заблокированных пользователей</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.bannedUsers
            .map(
                (userId) => `

                <div class="table-row">

                    <div class="table-title">
                        Пользователь
                    </div>

                    <div class="table-id">
                        ${escapeHtml(
                            String(
                                userId.id ??
                                userId
                            )
                        )}
                    </div>

                    <div>
                        <span class="ticket-status">
                            BANNED
                        </span>
                    </div>

                    <div>

                        <button
                            class="small-button"
                            onclick="unbanUser(
                                '${escapeAttribute(
                                    userId.id ??
                                    userId
                                )}'
                            )"
                        >
                            Разблокировать
                        </button>

                    </div>

                </div>
            `
            )
            .join("");
}


$("#banUserButton")
    .addEventListener(
        "click",
        banUser
    );


async function banUser() {

    const input =
        $("#banUserId");

    const userId =
        input.value.trim();

    if (
        !userId ||
        !/^\d+$/.test(userId)
    ) {

        showToast(
            "Введите корректный Telegram ID",
            "error"
        );

        return;
    }

    try {

        await apiRequest(
            "/users/ban",
            {
                method: "POST",

                body: JSON.stringify({
                    user_id:
                        Number(userId)
                })
            }
        );

        input.value = "";

        await loadUsers();

        await loadDashboard();

        showToast(
            "Пользователь заблокирован",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


async function unbanUser(
    userId
) {

    if (
        !confirm(
            `Разблокировать пользователя ${userId}?`
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/users/${encodeURIComponent(
                userId
            )}/unban`,
            {
                method: "POST"
            }
        );

        await loadUsers();

        await loadDashboard();

        showToast(
            "Пользователь разблокирован",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
    