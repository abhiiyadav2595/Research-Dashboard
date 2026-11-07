import os
import sys
from flask import jsonify

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app

# WSGI application entrypoint for Vercel Serverless Functions
app = create_app()

@app.route("/")
@app.route("/api")
def api_root():
    return jsonify({
        "status": "ok",
        "service": "PhD Progress Dashboard API",
        "version": "1.0.0",
        "database": "PostgreSQL (Neon Cloud Connected)",
    })

# WSGI Middleware to normalize PATH_INFO on Vercel
class VercelPathMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        raw_uri = environ.get("RAW_URI", "") or environ.get("REQUEST_URI", "")
        path_info = environ.get("PATH_INFO", "")

        # If Vercel rewrote the destination to /api/index.py or /api/index, restore original URI
        if path_info in ("/api/index.py", "/api/index", "/api/index/"):
            if raw_uri:
                clean_path = raw_uri.split("?")[0]
                environ["PATH_INFO"] = clean_path
            elif environ.get("HTTP_X_MATCHED_PATH"):
                environ["PATH_INFO"] = environ.get("HTTP_X_MATCHED_PATH")

        # If route was stripped of /api prefix (e.g. /health instead of /api/health), add it
        cur_path = environ.get("PATH_INFO", "")
        if cur_path and not cur_path.startswith("/api") and cur_path != "/":
            environ["PATH_INFO"] = "/api" + cur_path

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathMiddleware(app.wsgi_app)

if __name__ == "__main__":
    app.run()
