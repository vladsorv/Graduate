document.addEventListener("DOMContentLoaded", () => {
    const templateUpload = document.getElementById("templateUpload");
    const saveTemplate = document.getElementById("saveTemplate");
    const templateCanvas = document.getElementById("templateCanvas");
    const ctx = templateCanvas.getContext("2d");

    // Устанавливаем фиксированный размер для всех шаблонов (например, A4 в пикселях при 96 DPI)
    const FIXED_WIDTH = 794;  // Ширина A4
    const FIXED_HEIGHT = 1123; // Высота A4

    let templateImage = null;
    let textBlocks = [];

    // Обработчик загрузки шаблона
    templateUpload.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                templateImage = new Image();
                templateImage.onload = () => {
                    // Устанавливаем размеры canvas
                    templateCanvas.width = FIXED_WIDTH;
                    templateCanvas.height = FIXED_HEIGHT;

                    // Пропорционально масштабируем изображение, чтобы заполнить canvas
                    const imgWidth = templateImage.width;
                    const imgHeight = templateImage.height;

                    const scale = Math.min(
                        FIXED_WIDTH / imgWidth,
                        FIXED_HEIGHT / imgHeight
                    );

                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;

                    const offsetX = (FIXED_WIDTH - scaledWidth) / 2; // Центровка по горизонтали
                    const offsetY = (FIXED_HEIGHT - scaledHeight) / 2; // Центровка по вертикали

                    ctx.clearRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);
                    ctx.drawImage(
                        templateImage,
                        0,
                        0,
                        imgWidth,
                        imgHeight,
                        offsetX,
                        offsetY,
                        scaledWidth,
                        scaledHeight
                    );
                };
                templateImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Обработчик сохранения
    saveTemplate.addEventListener("click", () => {
        // Получаем данные изображения из canvas
        const imageData = templateCanvas.toDataURL("image/png");
    
        fetch("/save-template", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                imageData, // Данные изображения
                textBlocks, // Текстовые блоки, если они есть
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    alert("PDF успешно сохранён!");
                    if (data.downloadUrl) {
                        window.location.href = data.downloadUrl;
                    }
                } else {
                    alert(`Ошибка: ${data.error}`);
                }
            })
            .catch((error) => {
                console.error("Ошибка сохранения PDF:", error);
            });
    });
});