import os
import sys
from urllib.parse import parse_qs, urlencode
from flask import jsonify, send_from_directory

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
dist_dir = os.path.abspath(os.path.join(current_dir, "..", "frontend", "dist"))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app

# WSGI application entrypoint for Vercel Serverless Functions
app = create_app()

@app.route("/api")
def api_root():
    return jsonify({
        "status": "ok",
        "service": "PhD Progress Dashboard API",
        "version": "1.0.0",
        "database": "PostgreSQL (Neon Cloud Connected)",
    })

# If Vercel routes non-API requests to Flask, serve the compiled Vite frontend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    file_path = os.path.join(dist_dir, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(dist_dir, path)
    if os.path.isfile(os.path.join(dist_dir, "index.html")):
        return send_from_directory(dist_dir, "index.html")
    return jsonify({
        "status": "ok",
        "service": "PhD Progress Dashboard Backend",
        "message": "Frontend build artifacts initializing",
    })

# WSGI Middleware to normalize PATH_INFO on Vercel
class VercelPathMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        query_string = environ.get("QUERY_STRING", "")
        if query_string:
            params = parse_qs(query_string, keep_blank_values=True)
            if "__path" in params:
                subpath = params.pop("__path")[0]
                if subpath and not subpath.startswith("/"):
                    subpath = "/" + subpath
                environ["PATH_INFO"] = "/api" + subpath
                environ["QUERY_STRING"] = urlencode(params, doseq=True)

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathMiddleware(app.wsgi_app)

if __name__ == "__main__":
    app.run()
