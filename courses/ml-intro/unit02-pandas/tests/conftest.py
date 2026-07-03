import importlib.util
import os
from pathlib import Path


def load_exercise(name):
    unit_dir = Path(__file__).resolve().parents[1]
    if os.environ.get("USE_SOLUTIONS") == "1":
        target = unit_dir.parent / ".solutions" / unit_dir.name / f"{name}.py"
    else:
        target = unit_dir / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, target)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
