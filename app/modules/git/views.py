from flask import Blueprint, request, jsonify
from app import config
import os
from git import Repo, InvalidGitRepositoryError, NoSuchPathError

def get_blueprint():
    bp = Blueprint("git", __name__)

    def repo_path(name):
        return os.path.join(config.WORKSPACE_DIR, name)

    @bp.route("/")
    def index():
        return """
        <h1>Git Manager</h1>
        <ul>
          <li>POST /git/clone?url=&name=repo_name</li>
          <li>GET  /git/list</li>
          <li>GET  /git/<repo>/branches</li>
          <li>POST /git/<repo>/checkout?branch=branch_name</li>
          <li>POST /git/<repo>/pull</li>
        </ul>
        """

    @bp.route("/clone", methods=["POST"])
    def clone():
        url = request.args.get("url")
        name = request.args.get("name")
        if not url or not name:
            return jsonify({"error": "url and name required"}), 400

        path = repo_path(name)
        if os.path.exists(path):
            return jsonify({"error": "repo already exists"}), 400
        try:
            repo = Repo.clone_from(url, path)
            return jsonify({"ok": True, "name": name, "url": url, "branch": repo.active_branch.name})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/list")
    def list_repos():
        repos = []
        for d in os.listdir(config.WORKSPACE_DIR):
            path = repo_path(d)
            try:
                repo = Repo(path)
                repos.append({
                    "name": d,
                    "active_branch": str(repo.active_branch) if not repo.head.is_detached else "detached",
                    "url": list(repo.remotes.origin.urls)[0] if repo.remotes else None
                })
            except (InvalidGitRepositoryError, NoSuchPathError):
                continue
        return jsonify(repos)

    @bp.route("/<repo>/branches")
    def branches(repo):
        path = repo_path(repo)
        try:
            r = Repo(path)
            branches = [h.name for h in r.heads]
            current = str(r.active_branch) if not r.head.is_detached else "detached"
            return jsonify({"branches": branches, "current": current})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/<repo>/checkout", methods=["POST"])
    def checkout(repo):
        branch = request.args.get("branch")
        if not branch:
            return jsonify({"error": "branch required"}), 400
        path = repo_path(repo)
        try:
            r = Repo(path)
            r.git.checkout(branch)
            return jsonify({"ok": True, "branch": branch})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/<repo>/pull", methods=["POST"])
    def pull(repo):
        path = repo_path(repo)
        try:
            r = Repo(path)
            origin = r.remotes.origin
            res = origin.pull()
            return jsonify({"ok": True, "result": [str(x) for x in res]})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return bp
