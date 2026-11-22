"""Package the built Astro blog for local-only private preview.

No public site deployment. Windows viewers need no Python or Node.js.
"""
from pathlib import Path
from shutil import copy2, copytree, rmtree

root = Path(__file__).resolve().parent.parent
dist = root / "dist"
out = root / "private-preview"

if not (dist / "zh" / "index.html").exists():
    raise SystemExit("Missing dist/zh/index.html. Run npm run build first.")

if out.exists():
    rmtree(out)
out.mkdir(parents=True)
copytree(dist, out / "individual-blog")
copy2(root / "scripts" / "private-preview-server.py",
      out / "private-preview-server.py")
copy2(root / "scripts" / "private-preview-server.ps1",
      out / "private-preview-server.ps1")

(out / "START_PRIVATE_PREVIEW.bat").write_text(
    '@echo off\r\n'
    'cd /d "%~dp0"\r\n'
    'powershell.exe -NoProfile -ExecutionPolicy Bypass '
    '-File "%~dp0private-preview-server.ps1"\r\n'
    'if errorlevel 1 (\r\n'
    '  echo The private preview could not start.\r\n'
    '  pause\r\n'
    ')\r\n',
    encoding="utf-8",
)
(out / "START_PRIVATE_PREVIEW.command").write_text(
    '#!/bin/sh\n'
    'cd "$(dirname "$0")"\n'
    'python3 private-preview-server.py\n',
    encoding="utf-8",
)
(out / "READ_ME_FIRST.txt").write_text(
    "Xiang's Blog - PRIVATE local preview\n"
    "===================================\n\n"
    "This package is NOT a public website or a GitHub Pages deployment.\n"
    "It may include unpublished demonstration drafts.\n\n"
    "WINDOWS (Python and Node.js NOT required):\n"
    "  1. Extract ALL files from the downloaded ZIP.\n"
    "  2. Double-click START_PRIVATE_PREVIEW.bat.\n"
    "  3. Your browser opens the Chinese homepage.\n"
    "  4. Keep the terminal window open while browsing.\n\n"
    "macOS/Linux: open a terminal in this folder and run:\n"
    "  python3 private-preview-server.py\n\n"
    "Use the language switch to view English pages.\n"
    "The server listens on 127.0.0.1 only (your own computer).\n"
    "Close the terminal or press Ctrl+C to stop the local preview.\n"
    "Search, archive, math and theme toggles work on localhost.\n"
    "Giscus comments have not been configured.\n",
    encoding="utf-8",
)
print(f"Private local preview packaged in {out}")
