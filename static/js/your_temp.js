document.addEventListener("DOMContentLoaded", () => {
    const templateUpload = document.getElementById("templateUpload");
    const addTextBlock = document.getElementById("addTextBlock");
    const saveTemplate = document.getElementById("saveTemplate");
    const templateCanvas = document.getElementById("templateCanvas");
    const ctx = templateCanvas.getContext("2d");

    const FIXED_WIDTH = 794; // Ширина A4
    const FIXED_HEIGHT = 1123; // Высота A4

    let templateImage = null;
    let textBlocks = [];
    let selectedBlock = null;
    let isResizing = false;
    let isDragging = false;
    let offsetX, offsetY;

    // Функция для отрисовки
    function drawCanvas() {
        ctx.clearRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);

        // Рисуем загруженный шаблон
        if (templateImage) {
            ctx.drawImage(templateImage, 0, 0, FIXED_WIDTH, FIXED_HEIGHT);
        }

        // Рисуем текстовые блоки
        textBlocks.forEach((block) => {
            ctx.font = `${block.fontSize}px Arial`;
            ctx.fillStyle = "black";
            ctx.fillText(block.text, block.x, block.y);

            // Отображаем рамку вокруг выделенного блока
            if (block === selectedBlock) {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                ctx.strokeRect(block.x - 5, block.y - block.fontSize, ctx.measureText(block.text).width + 10, block.fontSize + 10);
            }
        });
    }

    // Загрузка шаблона
    templateUpload.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                templateImage = new Image();
                templateImage.onload = () => {
                    templateCanvas.width = FIXED_WIDTH;
                    templateCanvas.height = FIXED_HEIGHT;
                    drawCanvas();
                };
                templateImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Добавление нового текстового блока
    addTextBlock.addEventListener("click", () => {
        const newBlock = {
            x: 50, // Начальная позиция
            y: 50,
            text: "Текстовый блок",
            fontSize: 20,
        };
        textBlocks.push(newBlock);
        selectedBlock = newBlock; // Сразу выделяем новый блок
        drawCanvas();
    });

    // Выбор текстового блока
    templateCanvas.addEventListener("mousedown", (event) => {
        const rect = templateCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        selectedBlock = null;
        isDragging = false;

        textBlocks.forEach((block) => {
            const textWidth = ctx.measureText(block.text).width;
            const textHeight = block.fontSize;

            if (
                x >= block.x - 5 &&
                x <= block.x + textWidth + 5 &&
                y >= block.y - textHeight &&
                y <= block.y + 5
            ) {
                selectedBlock = block;

                // Проверяем, resizing ли это (угол)
                if (x >= block.x + textWidth && x <= block.x + textWidth + 10) {
                    isResizing = true;
                } else {
                    isDragging = true;
                    offsetX = x - block.x;
                    offsetY = y - block.y;
                }
            }
        });

        drawCanvas();
    });

    // Перемещение или изменение размера блока
    templateCanvas.addEventListener("mousemove", (event) => {
        if (!selectedBlock) return;

        const rect = templateCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (isDragging) {
            selectedBlock.x = x - offsetX;
            selectedBlock.y = y - offsetY;
            drawCanvas();
        } else if (isResizing) {
            const newFontSize = Math.max(10, y - selectedBlock.y + selectedBlock.fontSize);
            selectedBlock.fontSize = newFontSize;
            drawCanvas();
        }
    });

    // Остановка перетаскивания или изменения размера
    templateCanvas.addEventListener("mouseup", () => {
        isDragging = false;
        isResizing = false;
    });

    // Удаление блока по нажатию Delete
    document.addEventListener("keydown", (event) => {
        if (event.key === "Delete" && selectedBlock) {
            textBlocks = textBlocks.filter((block) => block !== selectedBlock);
            selectedBlock = null;
            drawCanvas();
        }
    });

    // Редактирование текста в выбранном блоке
    document.addEventListener("keydown", (event) => {
        if (!selectedBlock) return;

        // Проверяем, является ли введённый символ допустимым
        if (event.key.length === 1) {
            selectedBlock.text += event.key;
            drawCanvas();
        } else if (event.key === "Backspace") {
            // Удаляем последний символ
            selectedBlock.text = selectedBlock.text.slice(0, -1);
            drawCanvas();
        }
    });

    // Сохранение шаблона
    saveTemplate.addEventListener("click", () => {
        // Создаём временный Canvas для сохранения
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
    
        // Устанавливаем размеры временного Canvas
        tempCanvas.width = FIXED_WIDTH;
        tempCanvas.height = FIXED_HEIGHT;
    
        // Локальная функция для отрисовки на временном Canvas
        function drawCleanCanvasWithoutDuplicate() {
            tempCtx.clearRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);
    
            // Рисуем загруженное изображение шаблона
            if (templateImage) {
                tempCtx.drawImage(templateImage, 0, 0, FIXED_WIDTH, FIXED_HEIGHT);
            }
    
            // Рисуем текстовые блоки один раз
            textBlocks.forEach((block) => {
                tempCtx.font = `${block.fontSize}px Arial`;
                tempCtx.fillStyle = "black";
                tempCtx.fillText(block.text, block.x, block.y);
            });
        }
    
        // Отрисовываем временный Canvas
        drawCleanCanvasWithoutDuplicate();
    
        // Генерируем Base64-изображение из временного Canvas
        const imageData = tempCanvas.toDataURL("image/png");
    
        // Логирование текстовых блоков для отладки
        console.log("Текстовые блоки для сохранения:", textBlocks);
    
        // Отправляем данные на сервер
        fetch("/save-template", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                imageData,  // Изображение в Base64
                textBlocks, // Текстовые блоки
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    console.log("Шаблон успешно сохранён. Ответ сервера:", data);
                    alert("Шаблон успешно сохранён!");
                    if (data.downloadUrl) {
                        window.location.href = data.downloadUrl; // Переход к загрузке файла
                    }
                } else {
                    console.error("Ошибка на сервере:", data.error);
                    alert(`Ошибка: ${data.error}`);
                }
            })
            .catch((error) => {
                console.error("Ошибка при отправке данных на сервер:", error);
            });
    });
});