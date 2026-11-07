from flask import Flask, jsonify
from config import Config
from app.extensions import db, migrate, jwt, bcrypt, cors, ma


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )

    # Import models so Flask-Migrate can detect them
    from app.models import (  # noqa: F401
        user, department, program, supervisor, student, semester,
        course, research, publication, submission, progress, system, billing,
    )

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.students import students_bp
    from app.routes.publications import publications_bp
    from app.routes.submissions import submissions_bp
    from app.routes.progress import progress_bp
    from app.routes.reports import reports_bp
    from app.routes.notifications import notifications_bp
    from app.routes.users import users_bp
    from app.routes.meta import meta_bp
    from app.routes.billing import billing_bp
    from app.routes.dbms import dbms_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(publications_bp, url_prefix="/api/publications")
    app.register_blueprint(submissions_bp, url_prefix="/api/submissions")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(meta_bp, url_prefix="/api/meta")
    app.register_blueprint(billing_bp, url_prefix="/api/billing")
    app.register_blueprint(dbms_bp, url_prefix="/api/dbms")

    @app.errorhandler(404)
    def not_found(e):
        from flask import request
        return jsonify({
            "error": "Not found",
            "requested_path": request.path,
            "environ_path_info": request.environ.get("PATH_INFO"),
            "raw_uri": request.environ.get("RAW_URI"),
            "request_uri": request.environ.get("REQUEST_URI"),
            "x_matched_path": request.environ.get("HTTP_X_MATCHED_PATH"),
        }), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app
