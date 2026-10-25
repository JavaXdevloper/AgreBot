"""test_stage_be5.py - Tests for Stage BE-5 Real Model Integration (Crop & Disease ResNet-18)."""
import os
import pytest
import numpy as np
from app.ml.crop_adapter import CropDiseaseAdapter, parse_label
from app.ml.model_contract import ModelMetadata
from app import create_app
from app.config import Config

def test_label_parser_formatting():
    # PlantVillage style
    assert parse_label("Tomato___Late_blight") == "Tomato: Late Blight"
    assert parse_label("Apple___healthy") == "Apple: Healthy"
    assert parse_label("Corn___Common_rust") == "Corn: Common Rust"
    # General labels
    assert parse_label("Almonds 1") == "Almonds 1"
    assert parse_label("Apple Braeburn 1") == "Apple Braeburn 1"

def test_crop_adapter_missing_files_reports_error():
    adapter = CropDiseaseAdapter(
        weights_path="nonexistent_model.pth",
        classes_path="nonexistent_classes.json"
    )
    status = adapter.load()
    assert status.state == "error"
    assert status.error["code"] == "MODEL_FILE_NOT_FOUND"
    assert adapter.predict(np.zeros((100, 100, 3), dtype=np.uint8)) == []

def test_crop_adapter_inspects_real_model_files():
    weights_path = os.path.abspath("AgreBot/ml/Crop_model/models/combined/combined_model.pth")
    classes_path = os.path.abspath("AgreBot/ml/Crop_model/models/combined/class_names.json")

    # If running on machine with torch, test full load; if torch is not installed, verify error report
    adapter = CropDiseaseAdapter(
        weights_path=weights_path,
        classes_path=classes_path,
        confidence_threshold=0.50
    )
    status = adapter.load()

    try:
        import torch
        assert status.state == "ready"
        assert status.name == "ResNet18-CropDisease"
        # Test predict with mock leaf frame (BGR format)
        test_frame = np.full((480, 640, 3), 120, dtype=np.uint8)
        preds = adapter.predict(test_frame)
        assert isinstance(preds, list)
    except ImportError:
        # Graceful handling when torch is missing from local Python 3.14 environment
        assert status.state == "error"
        assert status.error["code"] == "PYTORCH_NOT_INSTALLED"

def test_app_initialization_with_model_enabled(tmp_path):
    weights_path = os.path.abspath("AgreBot/ml/Crop_model/models/combined/combined_model.pth")
    classes_path = os.path.abspath("AgreBot/ml/Crop_model/models/combined/class_names.json")

    cfg = Config(
        DATABASE_PATH=str(tmp_path / "test.db"),
        LOG_DIR=str(tmp_path / "logs"),
        CONTROL_PIN="1234",
        MODEL_ENABLED=True,
        MODEL_PATH=weights_path,
        MODEL_CLASSES_PATH=classes_path
    )
    app = create_app(cfg)
    assert app.model_adapter is not None
    status = app.model_adapter.status()
    assert status.state in ("ready", "error")
