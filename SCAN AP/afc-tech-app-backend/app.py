from flask import Flask
from db import db
from flask_cors import CORS
from dotenv import load_dotenv
import os

from routes.hospital_routes import hospital_bp
from routes.ahu_routes import ahu_bp
from routes.tech_routes import tech_bp
from routes.job_routes import job_bp
from routes.admin import admin_bp
from routes.schedule_routes import schedule_bp

load_dotenv()


#hope this works
def create_app():
    app = Flask(__name__)

    # -----------------------------
    # DATABASE CONFIG
    # -----------------------------
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE is not set. check .env")
    
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app)

    db.init_app(app)

    app.register_blueprint(ahu_bp, url_prefix="/api")
    app.register_blueprint(job_bp, url_prefix="/api")
    app.register_blueprint(tech_bp, url_prefix="/api")
    app.register_blueprint(hospital_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(schedule_bp, url_prefix="/api")

    @app.route("/")
    def home():
        return {"message": "AFC Technician API Running"}

    return app


# 👇 THIS is what Gunicorn should load
app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
