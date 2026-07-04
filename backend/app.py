"""
Task Ledger — backend API
Flask + SQLAlchemy + JWT auth + CRUD for tasks.

Run:
    pip install -r requirements.txt
    python app.py

Server starts on http://localhost:5000
"""


import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='../frontend/dist')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# ... rest of your code continues here

# Get the absolute path to the directory where this script is located
base_dir = os.path.abspath(os.path.dirname(__file__))

# Point to the 'frontend/dist' folder relative to the backend folder
# This assumes your structure is: webapp/backend/app.py and webapp/frontend/dist/
app = Flask(__name__, static_folder=os.path.join(base_dir, '../frontend/dist'))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Construct the path to the requested file
    file_path = os.path.join(app.static_folder, path)
    
    # If the file exists and is not a directory, serve it
    if path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    # Otherwise, serve index.html
    else:
        return send_from_directory(app.static_folder, 'index.html')


import re
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)  # allow the Vite dev server (any origin) to call this API

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------- models --
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tasks = db.relationship("Task", backref="owner", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "username": self.username, "email": self.email}


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="pending")  # pending | in_progress | done
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


with app.app_context():
    db.create_all()


# ------------------------------------------------------------ validation --
def validation_error(errors):
    return jsonify({"errors": errors}), 400


# ------------------------------------------------------------------ auth --
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    errors = {}
    if len(username) < 3:
        errors["username"] = "Username must be at least 3 characters."
    if not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."

    if not errors:
        if User.query.filter_by(username=username).first():
            errors["username"] = "That username is already taken."
        if User.query.filter_by(email=email).first():
            errors["email"] = "That email is already registered."

    if errors:
        return validation_error(errors)

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return validation_error({"form": "Username and password are required."})

    user = User.query.filter(
        (User.username == username) | (User.email == username.lower())
    ).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"errors": {"form": "Invalid username or password."}}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"errors": {"form": "User not found."}}), 404
    return jsonify(user.to_dict())


# ------------------------------------------------------------- task crud --
def current_user_id():
    return int(get_jwt_identity())


@app.route("/api/tasks", methods=["GET"])
@jwt_required()
def list_tasks():
    tasks = (
        Task.query.filter_by(user_id=current_user_id())
        .order_by(Task.created_at.desc())
        .all()
    )
    return jsonify([t.to_dict() for t in tasks])


@app.route("/api/tasks", methods=["POST"])
@jwt_required()
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    status = data.get("status") or "pending"

    errors = {}
    if not title:
        errors["title"] = "Title is required."
    elif len(title) > 200:
        errors["title"] = "Title must be under 200 characters."
    if status not in ("pending", "in_progress", "done"):
        errors["status"] = "Invalid status."

    if errors:
        return validation_error(errors)

    task = Task(
        title=title,
        description=description,
        status=status,
        user_id=current_user_id(),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user_id()).first()
    if not task:
        return jsonify({"errors": {"form": "Task not found."}}), 404

    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return validation_error({"title": "Title is required."})
        task.title = title
    if "description" in data:
        task.description = (data.get("description") or "").strip()
    if "status" in data:
        if data["status"] not in ("pending", "in_progress", "done"):
            return validation_error({"status": "Invalid status."})
        task.status = data["status"]

    db.session.commit()
    return jsonify(task.to_dict())


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user_id()).first()
    if not task:
        return jsonify({"errors": {"form": "Task not found."}}), 404
    db.session.delete(task)
    db.session.commit()
    return "", 204


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
