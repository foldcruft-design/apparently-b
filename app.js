const tg = window.Telegram.WebApp;
tg.expand(); // Открывает Web App на весь экран

// Функция навигации внутри Mini App
function nav(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
}

// Отправка данных на сервер бота (в handlers_2.py)
function sendAction(actionType) {
    tg.HapticFeedback.impactOccurred('light'); // Вибрация при нажатии
    
    // Формируем JSON с командой (соответствует callback_data из бота)
    const data = JSON.stringify({ action: actionType });
    
    // Отправляем в бот и закрываем Mini App
    tg.sendData(data);
    tg.close();
}
