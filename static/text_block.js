let textBlocks = [];
let selectedBlock = null;
let isResizing = false;
let isDragging = false;
let resizeDirection = null;

const HANDLE_SIZE = 10;
const CURSOR_BLINK_INTERVAL = 500;
let cursorBlinkInterval = null;
let cursorVisible = true;
let cursorPosition = { line: 0, char: 0 };

function drawTextBlocks(ctx) {
    textBlocks.forEach((block) => {
        const textLines = block.text.split("\n");

        // Автоматическая корректировка высоты блока под текст
        const requiredHeight = textLines.length * block.fontSize + 10;
        if (block.height < requiredHeight) {
            block.height = requiredHeight;
        }

        // Рисуем рамку блока
        ctx.strokeStyle = block === selectedBlock ? "blue" : "gray";
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x, block.y, block.width, block.height);

        // Отрисовка текста
        ctx.font = `${block.fontSize}px Arial`;
        ctx.fillStyle = "black";
        textLines.forEach((line, i) => {
            const textWidth = ctx.measureText(line).width;
            const textX = block.x + (block.width - textWidth) / 2; // Центрирование текста
            const textY = block.y + (i + 1) * block.fontSize; // Смещение строки по вертикали
            ctx.fillText(line, textX, textY);
        });

        // Рисуем курсор
        if (block === selectedBlock && cursorVisible) {
            drawCursor(ctx, block);
        }
    });
}

function drawCursor(ctx, block) {
    const cursorPosition = block.cursorPosition; // Используем положение курсора блока
    const lines = block.text.split("\n");
    const currentLine = lines[cursorPosition.line] || "";
    const textWidth = ctx.measureText(currentLine.slice(0, cursorPosition.char)).width;

    const cursorX = block.x + (block.width - ctx.measureText(currentLine).width) / 2 + textWidth;
    const cursorY = block.y + (cursorPosition.line + 1) * block.fontSize;

    // Увеличение блока при выходе курсора за нижнюю границу
    if (cursorY > block.y + block.height) {
        block.height += block.fontSize;
    }

    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY - block.fontSize);
    ctx.lineTo(cursorX, cursorY);
    ctx.strokeStyle = "black";
    ctx.stroke();
}

function addNewTextBlock() {
    const newBlock = {
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        text: "",
        fontSize: 20,
        cursorPosition: { line: 0, char: 0 } // Новое свойство
    };
    textBlocks.push(newBlock);
    selectTextBlock(newBlock);
}

function selectTextBlock(block) {
    selectedBlock = block;
    startCursorBlink();
}

function startCursorBlink() {
    clearInterval(cursorBlinkInterval);
    cursorVisible = true;
    cursorBlinkInterval = setInterval(() => {
        cursorVisible = !cursorVisible;
        drawCanvas();
    }, CURSOR_BLINK_INTERVAL);
}

function stopCursorBlink() {
    clearInterval(cursorBlinkInterval);
    cursorVisible = false;
}

function detectCursorState(block, x, y) {
    const onLeftEdge = Math.abs(x - block.x) <= 2;
    const onRightEdge = Math.abs(x - (block.x + block.width)) <= 2;
    const onTopEdge = Math.abs(y - block.y) <= 2;
    const onBottomEdge = Math.abs(y - (block.y + block.height)) <= 2;

    if ((onLeftEdge || onRightEdge) && y >= block.y && y <= block.y + block.height) {
        return "resize-x"; // Изменение ширины
    }
    if ((onTopEdge || onBottomEdge) && x >= block.x && x <= block.x + block.width) {
        return "resize-y"; // Изменение высоты
    }

    const insideBlock =
        x >= block.x &&
        x <= block.x + block.width &&
        y >= block.y &&
        y <= block.y + block.height;

    if (insideBlock) {
        const textLines = block.text.split("\n");
        const relativeY = y - block.y; // Относительная позиция внутри блока
        const lineIndex = Math.floor(relativeY / block.fontSize);

        // Проверка, попали ли на строку текста
        if (lineIndex >= 0 && lineIndex < textLines.length) {
            return "text"; // Редактирование текста
        }
        return "move"; // Свободное пространство внутри блока
    }

    return "default"; // Вне блока
}

// Событие изменения состояния курсора
// Событие перемещения мыши
document.addEventListener("mousemove", (event) => {
    const rect = templateCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDragging && selectedBlock) {
        // Обновляем позицию блока
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        selectedBlock.x += deltaX;
        selectedBlock.y += deltaY;

        // Перемещаем точку начала перетаскивания
        dragStart = { x, y };

        // Перерисовка Canvas с сохранением текущей позиции курсора
        drawCanvas();
        return;
    }

    if (isResizing && selectedBlock) {
        if (resizeDirection === "resize-x") {
            selectedBlock.width = Math.max(50, x - selectedBlock.x);
        } else if (resizeDirection === "resize-y") {
            selectedBlock.height = Math.max(50, y - selectedBlock.y);
        }
        drawCanvas();
        return;
    }

    let cursorSet = false;
    textBlocks.forEach((block) => {
        const state = detectCursorState(block, x, y);

        if (state === "resize-x") {
            templateCanvas.style.cursor = "ew-resize";
            cursorSet = true;
        } else if (state === "resize-y") {
            templateCanvas.style.cursor = "ns-resize";
            cursorSet = true;
        } else if (state === "move") {
            templateCanvas.style.cursor = "move";
            cursorSet = true;
        } else if (state === "text") {
            templateCanvas.style.cursor = "text";
            cursorSet = true;
        }
    });

    if (!cursorSet) {
        templateCanvas.style.cursor = "default";
    }
});


let dragStart = null;

function moveCursorWithMouse(block, x, y) {
    const ctx = templateCanvas.getContext("2d");
    ctx.font = `${block.fontSize}px Arial`;

    const textLines = block.text.split("\n");
    const relativeY = y - block.y;

    const lineIndex = Math.min(
        Math.max(0, Math.floor(relativeY / block.fontSize)),
        textLines.length - 1
    );

    const currentLine = textLines[lineIndex] || "";
    const relativeX = x - block.x;

    const totalTextWidth = ctx.measureText(currentLine).width;
    const textStartX = block.x + (block.width - totalTextWidth) / 2;

    if (x < textStartX) {
        block.cursorPosition = { line: lineIndex, char: 0 }; // Устанавливаем курсор для блока
        drawCanvas();
        return;
    }

    if (x > textStartX + totalTextWidth) {
        block.cursorPosition = { line: lineIndex, char: currentLine.length };
        drawCanvas();
        return;
    }

    let charIndex = 0;
    let accumulatedWidth = textStartX;

    for (let i = 0; i < currentLine.length; i++) {
        const charWidth = ctx.measureText(currentLine[i]).width;

        if (accumulatedWidth + charWidth / 2 >= x) {
            charIndex = i;
            break;
        }

        accumulatedWidth += charWidth;
    }

    block.cursorPosition = { line: lineIndex, char: charIndex }; // Сохраняем курсор для блока
    drawCanvas();
}



// Обработка кликов мыши
templateCanvas.addEventListener("mousedown", (event) => {
    const rect = templateCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let cursorSet = false;

    textBlocks.forEach((block) => {
        const state = detectCursorState(block, x, y);

        if (state === "text") {
            selectTextBlock(block);
            moveCursorWithMouse(block, x, y); // Корректное перемещение курсора
            cursorSet = true;
        } else if (state === "move") {
            selectTextBlock(block);
            dragStart = { x, y };
            isDragging = true;
            cursorSet = true;
        }
    });

    if (!cursorSet) {
        stopCursorBlink();
        selectedBlock = null;
    }

    drawCanvas();
});



document.addEventListener("mouseup", () => {
    isDragging = false;
    isResizing = false;
});

// Ввод текста в текстовый блок
document.addEventListener("keydown", (event) => {
    if (!selectedBlock) return;

    const block = selectedBlock;
    const cursorPosition = block.cursorPosition; // Локальный курсор для блока
    const lines = block.text.split("\n");

    if (event.key === "Delete") {
        // Удаление блока
        textBlocks = textBlocks.filter((b) => b !== block);
        selectedBlock = null;
        stopCursorBlink();
    } else if (event.key === "ArrowLeft") {
        if (cursorPosition.char > 0) {
            cursorPosition.char--; // Движение влево в пределах строки
        } else if (cursorPosition.line > 0) {
            // Переход на предыдущую строку
            cursorPosition.line--;
            cursorPosition.char = lines[cursorPosition.line].length;
        }
    } else if (event.key === "ArrowRight") {
        if (cursorPosition.char < lines[cursorPosition.line].length) {
            cursorPosition.char++; // Движение вправо в пределах строки
        } else if (cursorPosition.line < lines.length - 1) {
            // Переход на следующую строку
            cursorPosition.line++;
            cursorPosition.char = 0;
        }
    } else if (event.key === "ArrowUp") {
        if (cursorPosition.line > 0) {
            cursorPosition.line--; // Переход на предыдущую строку
            cursorPosition.char = Math.min(
                cursorPosition.char,
                lines[cursorPosition.line].length
            );
        }
    } else if (event.key === "ArrowDown") {
        if (cursorPosition.line < lines.length - 1) {
            cursorPosition.line++; // Переход на следующую строку
            cursorPosition.char = Math.min(
                cursorPosition.char,
                lines[cursorPosition.line].length
            );
        }
    } else if (event.key === "Enter") {
        // Разделение строки
        const currentLine = lines[cursorPosition.line];
        lines[cursorPosition.line] = currentLine.slice(0, cursorPosition.char);
        lines.splice(
            cursorPosition.line + 1,
            0,
            currentLine.slice(cursorPosition.char)
        );
        cursorPosition.line++;
        cursorPosition.char = 0;
        block.text = lines.join("\n");
    } else if (event.key === "Backspace") {
        if (cursorPosition.char > 0) {
            // Удаление символа внутри строки
            const currentLine = lines[cursorPosition.line];
            lines[cursorPosition.line] =
                currentLine.slice(0, cursorPosition.char - 1) +
                currentLine.slice(cursorPosition.char);
            cursorPosition.char--;
        } else if (cursorPosition.line > 0) {
            // Объединение строк
            const previousLine = lines[cursorPosition.line - 1];
            const currentLine = lines[cursorPosition.line];
            cursorPosition.char = previousLine.length;
            lines[cursorPosition.line - 1] = previousLine + currentLine;
            lines.splice(cursorPosition.line, 1);
            cursorPosition.line--;
        }
        block.text = lines.join("\n");
    } else if (event.key.length === 1) {
        // Ввод символа
        const currentLine = lines[cursorPosition.line];
        lines[cursorPosition.line] =
            currentLine.slice(0, cursorPosition.char) +
            event.key +
            currentLine.slice(cursorPosition.char);
        cursorPosition.char++;
        block.text = lines.join("\n");
    }

    drawCanvas();
});