from flask import Blueprint, jsonify
import time

try:
    import psutil
except ImportError:
    psutil = None

def get_blueprint():
    bp = Blueprint("status", __name__)

    @bp.route("/json")
    def status_json():
        # fallback if psutil not installed
        if psutil is None:
            return jsonify({"error": "psutil not installed"}), 500

        cpu = psutil.cpu_percent(interval=0.1)
        load = psutil.getloadavg() if hasattr(psutil, "getloadavg") else ()
        mem = psutil.virtual_memory()._asdict()
        disk = psutil.disk_usage("/")._asdict()
        uptime = time.time() - psutil.boot_time()

        return jsonify({
            "cpu_percent": cpu,
            "load": load,
            "memory": mem,
            "disk": disk,
            "uptime_seconds": int(uptime)
        })

    @bp.route("/")
    def ui():
        # simple HTML overview — in real app use templates
        return """
        <h1>Server Status</h1>
        <p>JSON at <a href="./json">./json</a></p>
        """

    return bp
