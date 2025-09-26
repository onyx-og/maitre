import json
import importlib
import os
import subprocess
import sys
from flask import Flask

MODULES_DIR = os.path.join(os.path.dirname(__file__), "modules")

def create_app(config_object=None):
    app = Flask(__name__, instance_relative_config=False)
    # load config file or object
    if config_object:
        app.config.from_object(config_object)
    app.config.from_pyfile(os.path.join(os.path.dirname(__file__),'../.env'), silent=True)

    # register a simple root route
    @app.route("/")
    def index():
        """List all installed modules and their metadata"""
        modules_info = []
        if os.path.isdir(MODULES_DIR):
            for module_dir in os.listdir(MODULES_DIR):
                manifest_path = os.path.join(MODULES_DIR, module_dir, "manifest.json")
                if os.path.exists(manifest_path):
                    try:
                        with open(manifest_path) as f:
                            manifest = json.load(f)
                        modules_info.append({
                            "dir": module_dir,
                            "name": manifest.get("name", module_dir),
                            "version": manifest.get("version", "unknown"),
                            "description": manifest.get("description", ""),
                            "requires_root": manifest.get("requires_root", False),
                        })
                    except Exception as e:
                        modules_info.append({"dir": module_dir, "error": str(e)})
        return {"modules": modules_info}

    # load modules
    if os.path.isdir(MODULES_DIR):
        for module_dir in os.listdir(MODULES_DIR):
            mod_path = os.path.join(MODULES_DIR, module_dir)
            manifest_path = os.path.join(mod_path, "manifest.json")
            reqs_path = os.path.join(mod_path, "requirements.txt")

            # Skip if not a directory or no manifest
            if not os.path.isdir(mod_path) or not os.path.exists(manifest_path):
                continue

            # Only import if __init__.py exists
            if not os.path.exists(os.path.join(mod_path, "__init__.py")):
                app.logger.warning(f"Skipping {module_dir}: no __init__.py found")
                continue

            if os.path.isdir(mod_path) and os.path.exists(manifest_path):
                # install requirements if present
                if os.path.exists(reqs_path):
                    try:
                        subprocess.check_call(
                            [sys.executable, "-m", "pip", "install", "-r", reqs_path]
                        )
                        app.logger.info(f"Installed requirements for {module_dir}")
                    except Exception as e:
                        app.logger.error(f"Failed to install deps for {module_dir}: {e}")

                # import module
                try:
                    module_package = f"app.modules.{module_dir}"
                    module = importlib.import_module(module_package)
                    if hasattr(module, "get_blueprint"):
                        bp = module.get_blueprint()
                        app.register_blueprint(bp, url_prefix=f"/{module_dir}")
                    elif hasattr(module, "bp"):
                        app.register_blueprint(module.bp, url_prefix=f"/{module_dir}")
                    else:
                        app.logger.warning(f"Module {module_dir} has no blueprint")
                    app.logger.info(f"Loaded module {module_dir}")
                except Exception as e:
                    app.logger.error(f"Failed to load module {module_dir}: {e}")

    return app

def get_available_module_names():
    names = []
    if os.path.isdir(MODULES_DIR):
        for module_dir in os.listdir(MODULES_DIR):
            manifest_path = os.path.join(MODULES_DIR, module_dir, "manifest.json")
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                    names.append(manifest.get("name", module_dir))
                except:
                    names.append(module_dir)
    return names
