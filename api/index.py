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
        from urllib.parse import parse_qs, urlencode

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
