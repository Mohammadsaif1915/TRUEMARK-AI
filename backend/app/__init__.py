import os

from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")
load_dotenv(ENV_FILE)

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager


db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name=None):
    app = Flask(__name__)

    if config_name == "testing":
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test.db"
        app.config["TESTING"] = True
    else:
        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            raise RuntimeError(
                "DATABASE_URL is missing. Please check the .env file."
            )

        app.config["SQLALCHEMY_DATABASE_URI"] = database_url

    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY",
        "dev-secret-key"
    )

    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY",
        "dev-jwt-secret"
    )

    app.config["UPLOAD_FOLDER"] = os.path.join(
        PROJECT_ROOT,
        "backend",
        "uploads"
    )

    app.config["MAX_CONTENT_LENGTH"] = int(
        os.getenv(
            "MAX_CONTENT_LENGTH",
            16 * 1024 * 1024
        )
    )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    os.makedirs(
        app.config["UPLOAD_FOLDER"],
        exist_ok=True
    )

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*"
            }
        }
    )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register routes
    from app.routes.auth import auth_bp
    from app.routes.scan import scan_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.history import history_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        scan_bp,
        url_prefix="/api/scan"
    )

    app.register_blueprint(
        dashboard_bp,
        url_prefix="/api/dashboard"
    )

    app.register_blueprint(
        history_bp,
        url_prefix="/api/history"
    )

    app.register_blueprint(
        admin_bp,
        url_prefix="/api/admin"
    )

    # Serve uploaded files
    @app.route("/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename
        )

    # Create database tables
    with app.app_context():
        db.create_all()

        # Ensure anonymous citizen user exists
        from app.models import User

        anon = User.query.filter_by(
            username="anonymous_citizen"
        ).first()

        if not anon:
            anon = User(
                username="anonymous_citizen",
                email="anonymous@truemark.local",
                role="citizen",
                full_name="Anonymous Citizen"
            )

            anon.set_password(
                "anonymous_password_123"
            )

            db.session.add(anon)
            db.session.commit()

        # Fixed development administrator for hackathon/demo access.
        admin_email = os.getenv("ADMIN_EMAIL", "admin@truemark.local").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "TrueMarkAdmin@2026")
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                username="truemark_admin",
                email=admin_email,
                role="administrator",
                full_name="TrueMark Administrator",
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()

    return app