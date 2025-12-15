from flask import Flask
from db import db
from flask_cors import CORS
from routes.hospital_routes import hospital_bp
from routes.ahu_routes import ahu_bp
from routes.tech_routes import tech_bp
from routes.job_routes import job_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__)

    # -----------------------------
    # DATABASE CONFIG
    # -----------------------------
    app.config["SQLALCHEMY_DATABASE_URI"] = 'postgresql://neondb_owner:npg_Py3QvJn6dTgF@ep-odd-cell-afq855xw-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Allow React frontend to communicate with Flask
    CORS(app)

    # Init SQLAlchemy
    db.init_app(app)


    app.register_blueprint(ahu_bp, url_prefix="/api")
    app.register_blueprint(job_bp, url_prefix="/api")
    app.register_blueprint(tech_bp, url_prefix="/api")
    app.register_blueprint(hospital_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    # Simple root endpoint
    @app.route("/")
    def home():
        return {"message": "AFC Technician API Running"}

    return app


if __name__ == "__main__":
    app = create_app()
    #this runs for my home computer lol
    app.run(debug=True, host="192.168.1.167")
    #app.run(debug=True, host="192.168.1.131")

