// Добавляем обработчик события input для поля ввода имени
document.getElementById('fullName').addEventListener('input', function () {
    const fullName = this.value;
    drawTextOnCertificate(fullName);
});

// Получаем элементы DOM
const certificateImage = document.getElementById('certificateImage');
const overlayCanvas = document.getElementById('overlayCanvas');
let ctx;

// Функция для отрисовки текста на холсте поверх изображения
function drawTextOnCertificate(text) {
    if (!ctx) {
        // Инициализация холста при первом вызове функции
        overlayCanvas.width = certificateImage.clientWidth;
        overlayCanvas.height = certificateImage.clientHeight;
        ctx = overlayCanvas.getContext('2d');
    }

    // Очистка холста перед новой отрисовкой
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Настройки шрифта и положения текста
    ctx.font = 'normal 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; // Цвет текста

    // Координаты для размещения текста на холсте
    const x = overlayCanvas.width / 2;
    const y = overlayCanvas.height * 0.55; // Примерная область для Ф.И.О., можно изменить

    // Отображение текста на холсте
    ctx.fillText(text, x, y);
}

// Обработчик загрузки CSV-файла
document.getElementById('csvForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    fetch('/process-csv', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert(`Готово! Грамоты созданы для ${data.count} записей.`);
    })
    .catch(error => {
        console.error('Error:', error);
    });
});