#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print("Open http://localhost:8080/test-simple.html to run tests")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")