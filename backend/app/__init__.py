"""__init__.py - Application factory for Agri Rover Backend."""
import logging
from logging.handlers import RotatingFileHandler
import os
import time
from flask import Flask, send_from_directory
from app.config import Config
from app.errors import register_error_handlers
from app.db.connection import DatabaseConnectionPool
from app.db.migrations import run_migrations
from app.db.repositories import SessionRepository, DetectionRepository, EventRepository
from app.services.auth_service import AuthService
from app.services.status_service import StatusService
from app.services.session_service import SessionService
from app.services.camera_service import CameraService
from app.services.detection_service import DetectionService
from app.services.inference_service import InferenceService
from app.services.pipeline import PipelineService
from app.services.serial_service import SerialService
from app.services.rover_safety import RoverSafety
from app.services.replay_service import ReplayService
from app.ml.model_adapter import NotConfiguredAdapter
from app.api.health import health_bp
from app.api.status import status_bp
from app.api.auth import auth_bp
from app.api.camera import camera_bp
from app.api.video import video_bp
from app.api.detections import detections_bp
from app.api.rover import rover_bp
from app.api.events import events_bp
from app.api.replay import replay_bp

def setup_logging(app: Flask, config: Config):
    os.makedirs(config.LOG_DIR, exist_ok=True)
    log_file = os.path.join(config.LOG_DIR, "rover_backend.log")

    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
    )
    handler = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3)
    handler.setFormatter(formatter)
    handler.setLevel(getattr(logging, config.LOG_LEVEL.upper(), logging.INFO))

    app.logger.setLevel(getattr(logging, config.LOG_LEVEL.upper(), logging.INFO))
    app.logger.addHandler(handler)

def create_app(config: Config = None) -> Flask:
    if config is None:
        config = Config()
        config.validate()

    app = Flask(__name__)
    app.config_obj = config
    app.start_time = time.time()

    # Setup Logging
    setup_logging(app, config)

    # Initialize Database & Run Migrations
    app.db_pool = DatabaseConnectionPool(config.DATABASE_PATH)
    run_migrations(app.db_pool.get_connection())

    # Initialize Repositories
    app.session_repo = SessionRepository(app.db_pool)
    app.detection_repo = DetectionRepository(app.db_pool)
    app.event_repo = EventRepository(app.db_pool)

    # Initialize Services
    app.auth_service = AuthService(config)
    app.status_service = StatusService(config, app.start_time)
    app.session_service = SessionService(app.session_repo, app.event_repo)
    app.camera_service = CameraService(config, app.event_repo)

    # ML & Pipeline Services (Stage BE-4 & BE-5)
    if config.MODEL_ENABLED:
        from app.ml.crop_adapter import CropDiseaseAdapter
        app.model_adapter = CropDiseaseAdapter(
            weights_path=os.path.abspath(config.MODEL_PATH),
            classes_path=os.path.abspath(config.MODEL_CLASSES_PATH),
            confidence_threshold=config.MODEL_CONFIDENCE_THRESHOLD
        )
        app.model_adapter.load()
    else:
        app.model_adapter = NotConfiguredAdapter()
    app.inference_service = InferenceService(app.model_adapter, app.event_repo)
    app.detection_service = DetectionService(config, app.detection_repo)
    app.pipeline_service = PipelineService(
        config,
        app.camera_service,
        app.inference_service,
        app.detection_service,
        app.session_service
    )
    app.pipeline_service.start()

    # Hardware & Rover Control (Stage BE-6)
    app.serial_service = SerialService(config, app.event_repo)
    app.rover_safety = RoverSafety(config, app.serial_service, app.event_repo)
    app.rover_safety.start()

    # Replay Service (Stage BE-8)
    app.replay_service = ReplayService(config, app.camera_service, app.session_service)

    # Recover any crashed sessions on startup
    app.session_service.recover_on_startup()

    # Register Error Handlers
    register_error_handlers(app)

    # Register API Blueprints under /api
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(status_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(camera_bp, url_prefix="/api")
    app.register_blueprint(video_bp, url_prefix="/api")
    app.register_blueprint(detections_bp, url_prefix="/api")
    app.register_blueprint(rover_bp, url_prefix="/api")
    app.register_blueprint(events_bp, url_prefix="/api")
    app.register_blueprint(replay_bp, url_prefix="/api")

    # Placeholder / production frontend route
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/") or path == "api":
            from app.errors import ApiError
            raise ApiError("NOT_FOUND", "The requested API endpoint was not found.", 404)

        dist_path = os.path.abspath(config.FRONTEND_DIST_PATH)
        if os.path.exists(os.path.join(dist_path, path)) and path != "":
            return send_from_directory(dist_path, path)
        elif os.path.exists(os.path.join(dist_path, "index.html")):
            return send_from_directory(dist_path, "index.html")
        else:
            return (
                "<h1>Agri Rover Backend</h1><p>Backend is active. Frontend is not yet built in dist.</p>",
                200,
                {"Content-Type": "text/html"}
            )

    return app
