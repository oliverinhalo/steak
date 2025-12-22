from flask import Flask, request, jsonify, send_from_directory
import os
import sqlite3
import uuid
import socket

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

class _db():
    def __init__(self, path):
        self.path = path
        self.setup()

    def setup(self):
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS steaks
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, cost REAL, weight REAL, photo_filename TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        conn.close()

    def connect(self):
        self.conn = sqlite3.connect(self.path)
        self.cursor = self.conn.cursor()

    def disconnect(self):
        self.conn.commit()
        self.conn.close()

    def add_steak(self, steak_type, steak_cost, weight, photo_filename=None):
        self.connect()
        self.cursor.execute('''INSERT INTO steaks (type, cost, weight, photo_filename)
                               VALUES (?, ?, ?, ?)''', (steak_type, steak_cost, weight, photo_filename))
        self.conn.commit()
        # return the last inserted id
        last_id = self.cursor.lastrowid
        self.disconnect()
        return last_id

    def get_steaks(self):
        self.connect()
        self.cursor.execute('SELECT rowid AS id, type, cost, weight, photo_filename, timestamp FROM steaks ORDER BY rowid ASC')
        rows = self.cursor.fetchall()
        self.disconnect()
        return rows
    
    def delete_all(self):
        self.connect()
        self.cursor.execute('DELETE FROM steaks', ())
        self.conn.commit()
        self.disconnect()

    def get_latest_steak(self):
        self.connect()
        self.cursor.execute('SELECT rowid AS id, type, cost, weight, photo_filename, timestamp FROM steaks ORDER BY rowid DESC LIMIT 1')
        row = self.cursor.fetchone()
        self.disconnect()
        return row

# create DB instance for handlers
db = _db('steak.db')

@app.route('/steaks', methods=['GET'])
def list_steaks():
    rows = db.get_steaks()
    steaks = []
    for r in rows:
        steaks.append({
            'id': r[0],
            'type': r[1],
            'cost': r[2],
            'weight': r[3],
            'photo': r[4],
            'timestamp': r[5]
        })
    return jsonify(steaks)


@app.route('/add_steak', methods=['POST'])
def add_steak():
    data = request.get_json() or {}
    steak_type = data.get('type')
    cost = data.get('cost')
    weight = data.get('weight')
    photo = data.get('photo')
    if not steak_type or cost is None or weight is None:
        return jsonify(error='missing fields'), 400
    last_id = db.add_steak(steak_type, float(cost), float(weight), photo)
    row = db.get_latest_steak()
    if not row:
        return jsonify(error='insert failed'), 500
    steak = {
        'id': row[0],
        'type': row[1],
        'cost': row[2],
        'weight': row[3],
        'photo': row[4],
        'timestamp': row[5]
    }
    return jsonify(steak)


#db.delete_all()  # Clear existing data on startup for testing   
if __name__ == '__main__':
    ip = 'localhost'
    port = 8000
    print(f"Starting server on http://{ip}:{port}")
    app.run(host=ip, port=port, debug=True)
