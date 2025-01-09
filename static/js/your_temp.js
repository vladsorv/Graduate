document.addEventListener("DOMContentLoaded", () => {
    const templateUpload = document.getElementById("templateUpload");
    const addTextBlock = document.getElementById("addTextBlock");
    const saveTemplate = document.getElementById("saveTemplate");
    const templateCanvas = document.getElementById("templateCanvas");
    const ctx = templateCanvas.getContext("2d");

    const FIXED_WIDTH = 794; // Ширина A4
    const FIXED_HEIGHT = 1123; // Высота A4

    let templateImage = null;
    let isResizing = false;
    let isDragging = false;
    let resizeDirection = null;

    // Функция для отрисовки canvas
    function drawCanvas() {
        ctx.clearRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);

        // Рисуем загруженный шаблон
        if (templateImage) {
            ctx.drawImage(templateImage, 0, 0, FIXED_WIDTH, FIXED_HEIGHT);
        }

        // Отрисовываем текстовые блоки
        drawTextBlocks(ctx);
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
            x: 50,
            y: 50,
            width: 200,
            height: 100,
            text: "",
            fontSize: 20,
            fontFamily: "Arial",
            align: "center",
            padding: 5,
        };
        textBlocks.push(newBlock);
        selectTextBlock(newBlock);
        drawCanvas();
    });

    // Сохранение шаблона
    saveTemplate.addEventListener("click", () => {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        tempCanvas.width = FIXED_WIDTH;
        tempCanvas.height = FIXED_HEIGHT;

        tempCtx.clearRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);

        if (templateImage) {
            tempCtx.drawImage(templateImage, 0, 0, FIXED_WIDTH, FIXED_HEIGHT);
        }

        textBlocks.forEach((block) => {
            tempCtx.font = `${block.fontSize}px ${block.fontFamily}`;
            tempCtx.textAlign = block.align;
            tempCtx.fillStyle = "black";

            // Многострочная отрисовка текста
            const lines = block.text.split("\n");
            lines.forEach((line, i) => {
                const textX = block.x + block.width / 2; // Центрирование текста
                const textY = block.y + block.padding + (i + 1) * block.fontSize;
                tempCtx.fillText(line, textX, textY);
            });
        });

        const imageData = tempCanvas.toDataURL("image/png");

        fetch("/save-template", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                imageData,
                textBlocks,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    alert("Шаблон успешно сохранён!");
                    if (data.downloadUrl) {
                        window.location.href = data.downloadUrl;
                    }
                } else {
                    alert(`Ошибка: ${data.error}`);
                }
            })
            .catch((error) => {
                console.error("Ошибка при отправке данных на сервер:", error);
            });
    });

    // Обработка событий мыши для изменения размеров или перемещения блока
    templateCanvas.addEventListener("mousedown", (event) => {
        const rect = templateCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Определение, нужно ли изменять размер или перемещать блок
        isResizing = checkResize(x, y);
        isDragging = checkDrag(x, y);

        if (isResizing) {
            resizeDirection = determineResizeDirection(x, y);
        } else if (isDragging) {
            // Установить выбранный блок для перемещения
            selectedBlock = getBlockUnderCursor(x, y);
        }
    });

    templateCanvas.addEventListener("mousemove", (event) => {
        if (isResizing && selectedBlock) {
            resizeBlock(event);
        } else if (isDragging && selectedBlock) {
            dragBlock(event);
        }
    });

    templateCanvas.addEventListener("mouseup", () => {
        isResizing = false;
        isDragging = false;
        resizeDirection = null;
    });

    // Остальные вспомогательные функции, включая drawTextBlocks(), checkResize(), checkDrag(), resizeBlock(), dragBlock(),
    // находятся в файле text_block.js.

    window.drawCanvas = drawCanvas; // Делаем drawCanvas доступным для text_block.js
});