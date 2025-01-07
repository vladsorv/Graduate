import base64
import re
from tkinter import Image
from flask import Flask, jsonify, render_template, request, send_file
import io
from fpdf import FPDF
import csv
from werkzeug.utils import secure_filename
import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Список разрешённых расширений файлов
ALLOWED_EXTENSIONS = {'csv'}
# Определение функции проверки расширения файла
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Создаем экземпляр приложения Flask
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = r'C:\Users\maslo\Downloads'

# Регистрация шрифта с поддержкой Unicode
FONT_PATH = "static/fonts/DejaVuSans.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", FONT_PATH))
# Определяем маршрут для главной страницы
@app.route('/')
def index():
    return render_template('index.html')

# Маршрут для генерации PDF
@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    # Получаем значение из формы
    full_name = request.form['fullName']

    # Генерируем PDF с использованием UTF-8
    pdf = FPDF('P', 'mm', 'A4')
    pdf.add_page()
    pdf.add_font('DejaVu', '', 'C:/Users/maslo/Desktop/Gramota/DejaVu Sans/DejaVuSans.ttf', uni=True)
    pdf.set_font('DejaVu', '', 22)

    # Вставляем изображение грамоты
    pdf.image('C:/Users/maslo/Desktop/Gramota/static/images/template1_ext.jpg', x=0, y=0, w=210, h=297, type='JPG')

    # Размещаем текст на изображении
    pdf.ln(90)
    pdf.cell(w=180, h=40, align='C', txt=full_name, border=False)

    # Сохраняем PDF
    pdf.output("certificate.pdf")

    # Отправляем PDF клиенту
    with open("certificate.pdf", "rb") as file:
        data = file.read()

    return send_file(
        io.BytesIO(data),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'{full_name}_certificate.pdf'
    )

# Маршрут для отображения template1.html
@app.route('/template1')
def template1():
    return render_template('template1.html')

@app.route('/your_temp')
def your_temp():
    return render_template('your_temp.html')

# Маршрут для обработки CSV-файла
@app.route('/process-csv', methods=['POST'])
def process_csv():
    if 'csvfile' not in request.files:
        return jsonify({'error': 'CSV-файл не был загружен.'}), 400

    file = request.files['csvfile']
    if file.filename == '':
        return jsonify({'error': 'Файл не был выбран.'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        records = []
        with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), encoding='utf-8-sig') as csvfile:
            reader = csv.reader(csvfile)
            for row in reader:
                cleaned_row = re.sub(r'\s+', ' ', row[0]).strip()
                if cleaned_row:
                    records.append(cleaned_row)

        for record in records:
            logger.info(f"Gererating certificate for: {record}")
            generate_certificate(record)

        return jsonify({'count': len(records)})

    else:
        return jsonify({'error': 'Неверный формат файла.'}), 400

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_certificate(name):
    # Генерируем PDF с использованием UTF-8
    pdf = FPDF('P', 'mm', 'A4')
    pdf.add_page()
    pdf.add_font('DejaVu', '', 'C:/Users/maslo/Desktop/Gramota/DejaVu Sans Condensed/DejaVuSansCondensed.ttf', uni=True)
    pdf.set_font('DejaVu', '', 22)

    # Вставляем изображение грамоты
    pdf.image('C:/Users/maslo/Desktop/Gramota/static/images/template1_ext.jpg', x=0, y=0, w=210, h=297, type='JPG')

    # Размещаем текст на изображении
    pdf.ln(90)
    pdf.cell(w=190, h=40, align='C', txt=name, border=False)

    # Сохраняем PDF
    output_filename = os.path.join(r'C:\Users\maslo\Downloads', f"{name.replace(' ', '_')}.pdf")
    pdf.output(output_filename)

@app.route('/save-template', methods=['POST'])
def save_template():
    try:
        data = request.json
        image_data = data.get('imageData')
        text_blocks = data.get('textBlocks', [])

        if not image_data:
            raise ValueError("Нет данных изображения")

        # Декодируем Base64 изображение
        header, encoded = image_data.split(",", 1)
        image_bytes = io.BytesIO(base64.b64decode(encoded))
        img = Image.open(image_bytes)

        # Конвертируем RGBA в RGB (если необходимо)
        if img.mode == 'RGBA':
            img = img.convert('RGB')

        # Сохраняем изображение во временный файл
        temp_image_path = "output/temp_image.jpg"
        os.makedirs("output", exist_ok=True)
        img.save(temp_image_path, format="JPEG")

        # Создаем PDF с шаблоном и текстом
        output_pdf_path = "output/template_with_text.pdf"
        pdf_canvas = canvas.Canvas(output_pdf_path, pagesize=(img.width, img.height))

        # Добавляем фоновое изображение
        pdf_canvas.drawImage(temp_image_path, 0, 0, width=img.width, height=img.height)

        # Завершаем PDF-документ
        pdf_canvas.save()

        # Удаляем временный файл изображения
        os.remove(temp_image_path)

        return jsonify({"success": True, "downloadUrl": f"/download/{output_pdf_path}"})

    except Exception as e:
        app.logger.error(f"Ошибка при обработке изображения: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/download/<path:filename>")
def download_file(filename):
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)