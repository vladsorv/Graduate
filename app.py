from flask import Flask, render_template, request, send_file
import io
from fpdf import FPDF

# Создаем экземпляр приложения Flask
app = Flask(__name__)

# Определяем маршрут для главной страницы
@app.route('/')
def index():
    return render_template('index.html')

# Маршрут для генерации PDF
@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    # Получаем значение из формы
    full_name = request.form['fullName']  # Оставляем строку как есть

    # Генерируем PDF с использованием UTF-8
    pdf = FPDF('P', 'mm', 'A4')
    pdf.add_page()
    pdf.add_font('DejaVu', '', 'C:/Users/maslo/Desktop/Gramota/DejaVu Sans Condensed/DejaVuSansCondensed.ttf', uni=True)  # Указываем полный путь к шрифту
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
        download_name='certificate.pdf'
    )

# Маршрут для отображения template1.html
@app.route('/template1')
def template1():
    return render_template('template1.html')

if __name__ == '__main__':
    app.run(debug=True)
# C:/Users/maslo/Desktop/Gramota/DejaVu Sans Condensed/DejaVuSansCondensed.ttf