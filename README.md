# maitre

**maitre** is a modular server management dashboard written in Python (Flask).  
It is designed to be **extensible**, so new features can be added easily as modules.  

The goal is to provide a single interface to manage multiple aspects of a server, including:
- 🖥️ View server status and resource usage
- 📡 View network traffic logs (planned)
- 🔄 Clone and manage Git repositories
- 🚀 Deploy Node.js, PHP, and Java/Tomcat apps (planned)
- 🌐 Manage domains, DNS, and Let's Encrypt certificates (planned)
- 🛠 Control nginx settings (planned)
- 🐳 Manage Docker containers (planned)
- 🔥 Manage firewall rules (planned)
- 🔑 Manage SSH users (planned)
- 🗄 Manage MySQL and PostgreSQL databases (planned)
- 📂 File explorer backend (planned)
- 🖥️ xterm-compatible terminal backend (planned)

---

## Features Implemented

- **Modular architecture**  
  Each module lives in `maitre/modules/<name>/` and can declare its own dependencies in a `requirements.txt`.  
  Dependencies are automatically installed when the app starts.  

- **Status module**  
  Shows CPU usage, memory, disk space, and uptime via [`psutil`](https://pypi.org/project/psutil/).  

- **Git module**  
  Manage Git repositories inside a controlled workspace:  
  - Clone repositories  
  - List repositories  
  - List and switch branches  
  - Pull updates  

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/maitre.git
cd maitre
```
### 2. Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```
### 3. Install core dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```
### 4. Run the app
```bash
export FLASK_APP=maitre.app:create_app
flask run --host=127.0.0.1 --port=8000
```
### 5. Test endpoints

* Index (list modules)
  http://127.0.0.1:8000/
* Status module
  * http://127.0.0.1:8000/status/
  * http://127.0.0.1:8000/status/json
* Git module
  * Clone a repo:
  ```bash
    curl -X POST "http://127.0.0.1:8000/git/clone?url=https://github.com/onyx-og/docstack.git&name=docstack"
  ```
  * List repos:
  ```bash
    curl "http://127.0.0.1:8000/git/list"
  ```
## Configuration

The Git workspace directory defaults to:
```bash
~/.maitre/workspace
```
You can override it with an environment variable:
```bash
export MAITRE_WORKSPACE=/path/to/workspace
```

## Roadmap

* Add user authentication using [docstack](https://github.com/onyx-og/docstack)
* Extend Git module with commit history and tagging
* Add Docker management
* Add nginx and SSL (Let’s Encrypt) management
* Add database management (MySQL, PostgreSQL)
* Add file explorer and xterm terminal backend
* Build a web frontend UI leveraging [Prismal](https://github.com/onyx-og/prismal)
