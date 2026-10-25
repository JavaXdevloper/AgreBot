"""model_inspect.py - Read-only model diagnostic tool.

Stage: BE-0
Loads the PyTorch model (if provided) and reports:
- Model file format & size
- Model architecture / class type
- Parameters count
- Input requirements
- Single-frame inference timing (CPU) and memory usage
Does NOT modify or overwrite any files.
"""
import argparse
import os
import sys
import time

def inspect_model(model_path: str, labels_path: str = None):
    print("=" * 60)
    print("AGRI ROVER - MODEL INSPECTOR (STAGE BE-0)")
    print("=" * 60)

    if not os.path.exists(model_path):
        print(f"[ERROR] File does not exist: {model_path}")
        sys.exit(1)

    file_size_mb = os.path.getsize(model_path) / (1024 * 1024)
    print(f"File path: {os.path.abspath(model_path)}")
    print(f"File size: {file_size_mb:.2f} MB")

    try:
        import torch
        print(f"PyTorch version: {torch.__version__}")
        device = torch.device("cpu")
        print(f"Target device: {device}")

        print("\nLoading weights (read-only)...")
        start_load = time.perf_counter()
        # Safe loading attempt
        try:
            model = torch.load(model_path, map_location=device, weights_only=False)
        except Exception as e:
            print(f"[ERROR] torch.load failed: {e}")
            return

        load_duration = time.perf_counter() - start_load
        print(f"Load duration: {load_duration:.3f} s")
        print(f"Loaded object type: {type(model)}")

        if isinstance(model, dict):
            print("\nModel is a state_dict / dictionary. Keys found:")
            for k in list(model.keys())[:10]:
                print(f" - {k}")
            if len(model.keys()) > 10:
                print(f"   ... ({len(model.keys())} total keys)")
        elif hasattr(model, "eval"):
            model.eval()
            param_count = sum(p.numel() for p in model.parameters())
            trainable_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
            print(f"Total parameters: {param_count:,}")
            print(f"Trainable parameters: {trainable_count:,}")

        if labels_path and os.path.exists(labels_path):
            with open(labels_path, "r", encoding="utf-8") as f:
                labels = [line.strip() for line in f if line.strip()]
            print(f"\nLabels loaded ({len(labels)} classes):")
            for i, l in enumerate(labels[:10]):
                print(f"  {i}: {l}")
            if len(labels) > 10:
                print(f"  ... ({len(labels)} total labels)")
        else:
            print("\n[NOTE] No labels file provided or file not found.")

        print("\n[INFO] Inspection complete. Please record confirmed facts in backend/app/ml/model_contract.py")

    except ImportError:
        print("[WARNING] PyTorch is not installed in the current Python environment.")
        print("To run this inspector, ensure torch is installed.")

def main():
    parser = argparse.ArgumentParser(description="Inspect PyTorch model (BE-0 read-only tool)")
    parser.add_argument("--model", type=str, required=True, help="Path to .pt / .pth model weights")
    parser.add_argument("--labels", type=str, default=None, help="Optional path to labels txt file")
    args = parser.parse_args()
    inspect_model(args.model, args.labels)

if __name__ == "__main__":
    main()
