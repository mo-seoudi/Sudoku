import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from api.sudoku.generator import generate_puzzle


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        difficulty = query.get("difficulty", ["medium"])[0]

        try:
            result = generate_puzzle(difficulty)
            payload = json.dumps(result).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:
            payload = json.dumps({
                "error": str(exc),
                "requestedDifficulty": difficulty,
            }).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
