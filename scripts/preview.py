"""Local preview of the exact publish directory, including Netlify security headers."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'dist'
HEADERS = []
for line in (ROOT / '_headers').read_text().splitlines():
    if line.startswith('  ') and ':' in line:
        name, value = line.strip().split(':', 1)
        HEADERS.append((name, value.strip()))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        for name, value in HEADERS:
            self.send_header(name, value)
        super().end_headers()

ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
