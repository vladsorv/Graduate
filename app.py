import base64
import re
import io
import csv
import os
from flask import Flask, jsonify, render_template, request, send_file
from werkzeug.utils import secure_filename
from fpdf import FPDF
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Конфигурация приложения
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"
FONT_PATH = "static/fonts/DejaVuSans.ttf"
TEMPLATE_IMAGE_PATH = "static/images/template1_ext.jpg"
ALLOWED_EXTENSIONS = {'csv'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Регистрация шрифта с поддержкой Unicode
pdfmetrics.registerFont(TTFont("DejaVu", FONT_PATH))

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_certificate(name):
    try:
        output_filename = os.path.join(OUTPUT_FOLDER, f"{name.replace(' ', '_')}.pdf")

        pdf = FPDF('P', 'mm', 'A4')
        pdf.add_page()
        pdf.add_font('DejaVu', '', FONT_PATH, uni=True)
        pdf.set_font('DejaVu', '', 22)

        pdf.image(TEMPLATE_IMAGE_PATH, x=0, y=0, w=210, h=297, type='JPG')
        pdf.ln(90)
        pdf.cell(w=190, h=40, align='C', txt=name, border=False)

        pdf.output(output_filename)
        logger.info(f"Сертификат создан: {output_filename}")
    except Exception as e:
        logger.error(f"Ошибка при создании сертификата для {name}: {e}")

def process_csv_file(file):
    records = []
    with open(file, encoding='utf-8-sig') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            cleaned_row = re.sub(r'\s+', ' ', row[0]).strip()
            if cleaned_row:
                records.append(cleaned_row)
    return records

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/template1')
def template1():
    return render_template('template1.html')

@app.route('/your_temp')
def your_temp():
    return render_template('your_temp.html')

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        full_name = request.form['fullName']

        pdf = FPDF('P', 'mm', 'A4')
        pdf.add_page()
        pdf.add_font('DejaVu', '', FONT_PATH, uni=True)
        pdf.set_font('DejaVu', '', 22)

        pdf.image(TEMPLATE_IMAGE_PATH, x=0, y=0, w=210, h=297, type='JPG')
        pdf.ln(90)
        pdf.cell(w=180, h=40, align='C', txt=full_name, border=False)

        output_filename = os.path.join(OUTPUT_FOLDER, "certificate.pdf")
        pdf.output(output_filename)

        with open(output_filename, "rb") as file:
            data = file.read()

        return send_file(
            io.BytesIO(data),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{full_name}_certificate.pdf'
        )
    except Exception as e:
        logger.error(f"Ошибка при генерации PDF: {e}")
        return jsonify({"error": "Ошибка при генерации PDF."}), 500

@app.route('/process-csv', methods=['POST'])
def process_csv():
    if 'csvfile' not in request.files:
        return jsonify({'error': 'CSV-файл не был загружен.'}), 400

    file = request.files['csvfile']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Неверный формат файла.'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        records = process_csv_file(filepath)
        for record in records:
            generate_certificate(record)

        return jsonify({'count': len(records)})
    except Exception as e:
        logger.error(f"Ошибка при обработке CSV: {e}")
        return jsonify({'error': 'Ошибка при обработке CSV.'}), 500

@app.route('/save-template', methods=['POST'])
def save_template():
    try:
        data = request.json
        image_data = data.get('imageData')

        if not image_data:
            raise ValueError("Нет данных изображения")

        header, encoded = image_data.split(",", 1)
        image_bytes = io.BytesIO(base64.b64decode(encoded))
        img = Image.open(image_bytes)

        if img.mode == 'RGBA':
            img = img.convert('RGB')

        temp_image_path = os.path.join(OUTPUT_FOLDER, "temp_image.jpg")
        img.save(temp_image_path, format="JPEG")

        output_pdf_path = os.path.join(OUTPUT_FOLDER, "template_with_text.pdf")
        pdf_canvas = canvas.Canvas(output_pdf_path, pagesize=(img.width, img.height))

        pdf_canvas.drawImage(temp_image_path, 0, 0, width=img.width, height=img.height)
        pdf_canvas.save()

        os.remove(temp_image_path)

        return jsonify({"success": True, "downloadUrl": f"/download/{output_pdf_path}"})
    except Exception as e:
        logger.error(f"Ошибка при сохранении шаблона: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/upload-csv', methods=['POST'])
def upload_csv():
    # Проверяем, был ли загружен файл
    if 'csvFile' not in request.files:
        return jsonify(success=False, error="Файл CSV не был загружен."), 400

    file = request.files['csvFile']

    # Проверяем формат файла
    if not file.filename.endswith('.csv'):
        return jsonify(success=False, error="Неверный формат файла. Загрузите CSV-файл."), 400

    try:
        # Парсинг CSV-файла
        file_data = file.read().decode('utf-8')
        csv_reader = csv.reader(file_data.splitlines())
        
        # Извлекаем имена (например, первую колонку)
        names = [row[0].strip() for row in csv_reader if row]

        if not names:
            return jsonify(success=False, error="CSV-файл пуст или содержит некорректные данные."), 400

        # Возвращаем список имён
        return jsonify(success=True, names=names)

    except Exception as e:
        return jsonify(success=False, error=f"Ошибка обработки файла: {str(e)}"), 500

@app.route('/save-my-template', methods=['POST'])
def save_my_template():
    data = request.get_json()

    if not data:
        return jsonify(success=False, error="Данные не переданы."), 400

    try:
        # Получаем данные изображения и имени файла
        image_data = data.get("imageData")
        filename = data.get("filename", "template.pdf")  # Имя PDF-файла

        if not image_data or not filename:
            return jsonify(success=False, error="Отсутствуют данные изображения или имя файла."), 400

        # Декодируем изображение из Base64
        image_data = image_data.split(",")[1]  # Убираем префикс 'data:image/png;base64,'
        image_bytes = base64.b64decode(image_data)

        # Конвертируем в изображение
        image = Image.open(io.BytesIO(image_bytes))
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

        # Сохраняем PDF-файл
        pdf_output_path = os.path.join(OUTPUT_FOLDER, "template_with_text.pdf")
        if image.mode == 'RGBA':  # Конвертируем, если изображение в формате RGBA
            image = image.convert('RGB')
        image.save(pdf_output_path, "PDF", resolution=100.0)

        # Проверяем, требуется ли вернуть ссылку для скачивания архива
        if "last_template" in data and data["last_template"]:
            # Создаём ZIP-архив с PDF-файлами
            zip_path = os.path.join(OUTPUT_FOLDER, "templates.zip")
            with zipfile.ZipFile(zip_path, "w") as zipf:
                for file in os.listdir(OUTPUT_FOLDER):
                    file_path = os.path.join(OUTPUT_FOLDER, file)
                    if file.endswith(".pdf"):  # Добавляем только PDF
                        zipf.write(file_path, os.path.basename(file_path))

            return jsonify(success=True, downloadUrl=f"/download/{os.path.basename(zip_path)}")

        return jsonify(success=True)

    except Exception as e:
        logger.error(f"Ошибка при сохранении шаблона: {e}")
        return jsonify(success=False, error=f"Ошибка сохранения шаблона: {str(e)}"), 500

@app.route("/download/<path:filename>")
def download_file(filename):
    try:
        return send_file(filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Ошибка при загрузке файла {filename}: {e}")
        return jsonify({"error": "Ошибка при загрузке файла."}), 500

if __name__ == '__main__':
    app.run(debug=True)