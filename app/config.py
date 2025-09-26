import os

WORKSPACE_DIR = os.environ.get("MAITRE_WORKSPACE", os.path.expanduser("~/.maitre/workspace"))

# ensure the workspace exists
os.makedirs(WORKSPACE_DIR, exist_ok=True)
