from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def download_gramota():
    return send_from_directory(directory='.', filename='gramota.pdf', as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)