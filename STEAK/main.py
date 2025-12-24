from flask import Flask, request, jsonify, send_from_directory, redirect, make_response
import os
import sqlite3
import uuid
import socket
import shutil
import hashlib

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
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, type TEXT, cook TEXT, cost REAL, weight REAL, photo_filename TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        # ensure 'user' column exists on older DBs
        try:
            c.execute("ALTER TABLE steaks ADD COLUMN user TEXT")
            conn.commit()
        except Exception:
            pass
        conn.close()

        # create users table
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users
                     (username TEXT PRIMARY KEY, password_hash TEXT, name TEXT, email TEXT)''')
        conn.commit()
        conn.close()

    def connect(self):
        self.conn = sqlite3.connect(self.path)
        self.cursor = self.conn.cursor()

    def disconnect(self):
        self.conn.commit()
        self.conn.close()

    def add_steak(self, user, steak_type, steak_cost, weight, cook, photo_filename=None):
        self.connect()
        self.cursor.execute('''INSERT INTO steaks (user, type, cost, weight, photo_filename, cook)
                               VALUES (?, ?, ?, ?, ?, ?)''', (user, steak_type, steak_cost, weight, photo_filename, cook))
        self.conn.commit()
        # return the last inserted id
        last_id = self.cursor.lastrowid
        self.disconnect()
        return last_id

    def get_steaks(self, for_user=None):
        self.connect()
        if for_user:
            self.cursor.execute('SELECT id, user, type, cook, cost, weight, photo_filename, timestamp FROM steaks WHERE user = ? ORDER BY id ASC', (for_user,))
        else:
            self.cursor.execute('SELECT id, user, type, cook, cost, weight, photo_filename, timestamp FROM steaks ORDER BY id ASC')
        rows = self.cursor.fetchall()
        self.disconnect()
        return rows
    
    def delete_all(self):
        self.connect()
        self.cursor.execute('DELETE FROM steaks')
        self.conn.commit()
        self.disconnect()

    def delete_steak(self, steak_id):
        self.connect()
        self.cursor.execute('DELETE FROM steaks WHERE id = ?', (steak_id,))
        self.conn.commit()
        affected = self.cursor.rowcount
        self.disconnect()
        return affected

    def get_steak(self, steak_id):
        self.connect()
        self.cursor.execute('SELECT id, user, type, cook, cost, weight, photo_filename, timestamp FROM steaks WHERE id = ?', (steak_id,))
        row = self.cursor.fetchone()
        self.disconnect()
        return row

    def get_latest_steak(self):
        self.connect()
        self.cursor.execute('SELECT id, user, type, cook, cost, weight, photo_filename, timestamp FROM steaks ORDER BY id DESC LIMIT 1')
        row = self.cursor.fetchone()
        self.disconnect()
        return row

    # user functions
    def add_user(self, username, password_hash, name='', email=''):
        self.connect()
        try:
            self.cursor.execute('INSERT INTO users (username, password_hash, name, email) VALUES (?, ?, ?, ?)', (username, password_hash, name, email))
            self.conn.commit()
        except sqlite3.IntegrityError:
            self.disconnect()
            return False
        self.disconnect()
        return True

    def get_user(self, username):
        self.connect()
        self.cursor.execute('SELECT username, password_hash, name, email FROM users WHERE username = ?', (username,))
        row = self.cursor.fetchone()
        self.disconnect()
        return row

    def verify_user(self, username, password):
        row = self.get_user(username)
        if not row:
            return False
        stored = row[1]
        h = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return h == stored

    def get_users(self):
        self.connect()
        self.cursor.execute('SELECT username, name, email FROM users')
        rows = self.cursor.fetchall()
        self.disconnect()
        return [{'username':r[0],'name':r[1],'email':r[2]} for r in rows]

# create DB instance for handlers
db = _db('steak.db')

def _get_request_user():
    # prefer cookie, fallback to header
    user = request.cookies.get('user')
    if not user:
        user = request.headers.get('x-user-id')
    return user

@app.route('/steaks', methods=['GET'])
def list_steaks():
    user = _get_request_user()
    if not user:
        return jsonify(error='unauthenticated'), 401
    rows = db.get_steaks(for_user=user)
    steaks = []
    for r in rows:
        steaks.append({
            'id': r[0],
            'user': r[1],
            'type': r[2],
            'cook': r[3],
            'cost': r[4],
            'weight': r[5],
            'photo': r[6],
            'timestamp': r[7]
        })
    return jsonify(steaks)


@app.route('/add_steak', methods=['POST'])
def add_steak():
    data = request.get_json() or {}
    user = _get_request_user()
    if not user:
        return jsonify(error='unauthenticated'), 401

    steak_type = data.get('type')
    cook = data.get('cook')
    cost = data.get('cost')
    weight = data.get('weight')
    photo = data.get('photo')
    if not steak_type or cost is None or weight is None or not cook:
        return jsonify(error='missing fields'), 400
    last_id = db.add_steak(user, steak_type, float(cost), float(weight), cook, photo)
    row = db.get_latest_steak()
    if not row:
        return jsonify(error='insert failed'), 500
    steak = {
        'id': row[0],
        'user': row[1],
        'type': row[2],
        'cook': row[3],
        'cost': row[4],
        'weight': row[5],
        'photo': row[6],
        'timestamp': row[7]
    }
    return jsonify(steak)


@app.route('/steaks/<int:steak_id>', methods=['DELETE'])
def delete_steak_route(steak_id):
    # verify steak exists first for clearer diagnostics
    try:
        row = db.get_steak(steak_id)
    except Exception as e:
        return jsonify(error='db error', detail=str(e)), 500
    if not row:
        return jsonify(error='not found'), 404

    user = _get_request_user()
    if not user:
        return jsonify(error='unauthenticated'), 401

    # ensure ownership
    steak_user = row[1]
    if steak_user != user:
        return jsonify(error='forbidden'), 403

    try:
        affected = db.delete_steak(steak_id)
    except Exception as e:
        return jsonify(error='delete failed', detail=str(e)), 500
    if affected and affected > 0:
        return jsonify(success=True), 200
    else:
        return jsonify(error='delete failed, 0 rows affected'), 500

@app.route('/ping', methods=['GET'])
def ping():
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    return jsonify(message='pong', hostname=hostname, ip_address=ip_address)


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    name = data.get('name') or ''
    email = data.get('email') or ''
    if not username or not password:
        return jsonify(error='missing fields'), 400
    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    ok = db.add_user(username, password_hash, name, email)
    if not ok:
        return jsonify(error='user exists'), 400
    resp = make_response(jsonify(user=username))
    resp.set_cookie('user', username, max_age=30*24*3600, httponly=True)
    return resp


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify(error='missing fields'), 400
    ok = db.verify_user(username, password)
    if not ok:
        return jsonify(error='invalid credentials'), 401
    resp = make_response(jsonify(user=username))
    resp.set_cookie('user', username, max_age=30*24*3600, httponly=True)
    return resp


@app.route('/logout', methods=['POST','GET'])
def logout():
    resp = make_response(redirect('/'))
    resp.set_cookie('user', '', expires=0)
    return resp


@app.route('/users', methods=['GET'])
def users_list():
    try:
        listu = db.get_users()
        return jsonify(listu)
    except Exception:
        return jsonify([])

@app.route('/reset_db')
def reset_db():
    # clear rows and recreate DB and uploads directory safely
    try:
        db.delete_all()
    except Exception:
        pass

    # remove DB file if present
    try:
        if os.path.exists(db.path):
            os.remove(db.path)
    except Exception:
        pass

    # remove uploads directory and recreate it
    try:
        if os.path.exists(UPLOADS):
            shutil.rmtree(UPLOADS)
    except Exception:
        pass
    os.makedirs(UPLOADS, exist_ok=True)

    # ensure DB is recreated with tables
    try:
        db.setup()
    except Exception:
        pass

    return redirect('/')


#db.delete_all()  # Clear existing data on startup for testing   
if __name__ == '__main__':
    ip = 'localhost'
    port = 8000
    print(f"Starting server on http://{ip}:{port}")
    app.run(host=ip, port=port, debug=True)
