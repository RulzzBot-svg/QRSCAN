from flask import Flask, jsonify
from db import db
from flask_cors import CORS
from dotenv import load_dotenv
import os

from extensions import limiter
from routes.hospital_routes import hospital_bp
from routes.ahu_routes import ahu_bp
from routes.tech_routes import tech_bp
from routes.job_routes import job_bp
from routes.admin import admin_bp
from routes.signature import signature_bp
from routes.qbd_conductor import qbd_bp

load_dotenv()

_DEFAULT_CORS = (
    "https://qrscan-lyart.vercel.app,"
    "https://qrscan-8ql2.onrender.com,"
    "http://localhost:5173,"
    "http://localhost:5174,"
    "http://127.0.0.1:5173,"
    "http://127.0.0.1:5174"
)


def create_app():
    app = Flask(__name__)

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is not set. check .env")

    jwt_secret = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET (or SECRET_KEY) must be set in .env")

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET"] = jwt_secret
    app.config["JWT_EXPIRY_HOURS"] = os.getenv("JWT_EXPIRY_HOURS", "12")
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # 2 MB request bodies

    cors_origins = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", _DEFAULT_CORS).split(",")
        if o.strip()
    ]
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["Content-Disposition"],
    )

    limiter.init_app(app)
    db.init_app(app)

    app.register_blueprint(ahu_bp, url_prefix="/api")
    app.register_blueprint(job_bp, url_prefix="/api")
    app.register_blueprint(tech_bp, url_prefix="/api")
    app.register_blueprint(hospital_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(signature_bp, url_prefix="/api")
    app.register_blueprint(qbd_bp, url_prefix="/api/qbd")

    @app.route("/")
    def home():
        return {"message": "AFC Technician API Running"}

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    return app


app = create_app()


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")
    app.run(debug=debug, host=os.getenv("FLASK_HOST", "127.0.0.1"))
