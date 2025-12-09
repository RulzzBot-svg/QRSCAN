from flask import Flask
from db import db
from flask_cors import CORS


def create_app():
    app = Flask(__name__)

    # -----------------------------
    # DATABASE CONFIG
    # -----------------------------
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://postgres:pass123@localhost/afc_tech"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Allow React frontend to communicate with Flask
    CORS(app)

    # Init SQLAlchemy
    db.init_app(app)

    # -----------------------------
    # Register Blueprints (Later)
    # -----------------------------
    # from routes.ahu_routes import ahu_bp
    # from routes.job_routes import job_bp
    # from routes.tech_routes import tech_bp
    # from routes.hospital_routes import hospital_bp
    #
    # app.register_blueprint(ahu_bp, url_prefix="/api")
    # app.register_blueprint(job_bp, url_prefix="/api")
    # app.register_blueprint(tech_bp, url_prefix="/api")
    # app.register_blueprint(hospital_bp, url_prefix="/api")

    # Simple root endpoint
    @app.route("/")
    def home():
        return {"message": "AFC Technician API Running"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
