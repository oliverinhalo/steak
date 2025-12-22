from flask import Flask, request, jsonify, send_from_directory
import os
import uuid

BASE_DIR = os.path.dirname(__file__)
UPLOADS = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOADS, exist_ok=True)

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/upload', methods=['POST'])
def upload():
    if 'photo' not in request.files:
        return jsonify(error='no file'), 400
    f = request.files['photo']
    ext = os.path.splitext(f.filename)[1] or '.jpg'
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(UPLOADS, filename)
    f.save(dest)
    return jsonify(success=True, filename=filename, url=f'/uploads/{filename}')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOADS, filename)

@app.route('/')
def index():
    return app.send_static_file('index.html')



if __name__ == '__main__':
    app.run(host='localhost', port=8000, debug=True)
