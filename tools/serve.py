#!/usr/bin/env python3
"""Static server for the repo (ES modules do not load from file://). serve.py [port] [--quiet]"""
import http.server, os, socketserver, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(next((a for a in sys.argv[1:] if a.isdigit()), "8765"))
quiet = "--quiet" in sys.argv
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a):
        if not quiet: super().log_message(*a)
H.extensions_map[".js"] = "text/javascript"; H.extensions_map[".mjs"] = "text/javascript"
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", port), H) as s:
    print(f"serving {ROOT} on http://127.0.0.1:{port}", flush=True); s.serve_forever()
