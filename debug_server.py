import http.server
import json
import os
import sys

class LogHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            log_entry = json.loads(post_data)
            
            with open("webflow_crash_logs.txt", "a") as f:
                f.write(f"[{log_entry.get('level', 'INFO').upper()}] {log_entry.get('message')}\n")
                if 'stack' in log_entry:
                    f.write(f"Stack Trace: {log_entry['stack']}\n")
                f.write("-" * 50 + "\n")
            
            # Print to local terminal
            color = "\033[91m" if log_entry.get('level') == 'error' else "\033[93m" if log_entry.get('level') == 'warn' else "\033[94m"
            reset = "\033[0m"
            print(f"{color}[{log_entry.get('level', 'INFO').upper()}]{reset} {log_entry.get('message')}")
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
        except Exception as e:
            print(f"Error handling log: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress default request logging to keep terminal clean
        return

if __name__ == "__main__":
    PORT = 5174
    print(f"🚀 Remote Debug Server running on http://localhost:{PORT}")
    print("Watching for Webflow Designer Extension errors...")
    http.server.HTTPServer(('0.0.0.0', PORT), LogHandler).serve_forever()
