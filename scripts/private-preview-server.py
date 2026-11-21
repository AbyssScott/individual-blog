"""Local-only HTTP server for Xiang's Blog private preview.

This binds ONLY to 127.0.0.1. It neither uploads files nor publishes a site.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        address = f"http://127.0.0.1:{server.server_port}/individual-blog/zh/"
        print("\nXiang's Blog — private local preview")
        print(f"Open: {address}")
        print("Visible only on this computer. Press Ctrl+C to stop.\n")
        webbrowser.open(address)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nPreview stopped.")


if __name__ == "__main__":
    main()
