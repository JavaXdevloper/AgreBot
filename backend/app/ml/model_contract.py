"""model_contract.py - Documented input/output of the real model.

Stage: BE-5 (Plant & Disease ResNet-18 Classifier)
Facts confirmed from AgreBot/ml/Crop_model inspection:
- Model Architecture: torchvision.models.resnet18 with custom 218-output linear fc head.
- Weights: AgreBot/ml/Crop_model/models/combined/combined_model.pth (45.2 MB)
- Class Mapping: AgreBot/ml/Crop_model/models/combined/class_names.json (218 classes)
- Preprocessing: Resize(256) -> CenterCrop(224) -> ToTensor() -> Normalize(mean, std)
- Color Order: RGB (converted from OpenCV BGR)
- Model Type: Classifier (outputs top class prediction + confidence, no bounding boxes)
"""
from dataclasses import dataclass
from typing import Optional, Tuple, List

@dataclass
class RawDetection:
    """Detection output returned by the model adapter."""
    label: str
    confidence: float  # Range: 0.0 to 1.0 inclusive (validated)
    class_id: Optional[int] = None
    bbox: Optional[Tuple[float, float, float, float]] = None  # None for classification models


@dataclass
class ModelMetadata:
    """Documented facts about the trained PyTorch model."""
    weights_path: str = "ml/Crop_model/models/combined/combined_model.pth"
    classes_path: str = "ml/Crop_model/models/combined/class_names.json"
    model_type: str = "classifier"
    architecture: str = "resnet18"
    input_size: Tuple[int, int] = (224, 224)
    color_order: str = "RGB"
    mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)
    std: Tuple[float, float, float] = (0.229, 0.224, 0.225)
    num_classes: int = 218
    confidence_threshold: float = 0.50
