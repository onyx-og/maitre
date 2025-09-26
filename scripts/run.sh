#!/bin/bash
# run.sh - launcher for maitre Flask app
# Usage:
#   ./run.sh dev       -> development mode
#   ./run.sh prod      -> production mode

APP_MODULE="app.main:create_app"
HOST="0.0.0.0"
PORT=8000
WORKERS=3          # Number of Gunicorn workers in production (tweak as needed)
BIND="${HOST}:${PORT}"

MODE=${1:-dev}

echo "Starting maitre in $MODE mode..."

if [ "$MODE" = "dev" ]; then
    # Development mode: Flask built-in server, debug enabled
    export FLASK_APP=$APP_MODULE
    export FLASK_ENV=development
    echo "Running Flask dev server on http://$HOST:$PORT"
    flask run --host=$HOST --port=$PORT

elif [ "$MODE" = "prod" ]; then
    # Production mode: Gunicorn WSGI server
    # --reload can be added for development auto-reload (optional)
    echo "Running Gunicorn with $WORKERS workers on http://$HOST:$PORT"
    APP_MODULE="run:app"
    exec gunicorn \
        --workers $WORKERS \
        --bind $BIND \
        --access-logfile - \
        --error-logfile - \
        --timeout 60 \
        "$APP_MODULE"

else
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [dev|prod]"
    exit 1
fi
