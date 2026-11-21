"""Package built Astro pages for a local-only Windows/macOS preview.

Expected input: dist/ (built with base='/individual-blog').
Output: private-preview/ directory to upload as a PRIVATE Actions artifact.
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
copy2(root / "scripts" / "private-preview-server.py", out / "private-preview-server.py")

(out / "START_PRIVATE_PREVIEW.bat").write_text(
    '@echo off\n'
    'cd /d "%~dp0"\n'
    'where py >nul 2>nul\n'
    'if %errorlevel%==0 (\n'
    '  py -3 private-preview-server.py\n'
    ') else (\n'
    '  python private-preview-server.py\n'
    ')\n'
    'pause\n',
    encoding="utf-8",
)
(out / "START_PRIVATE_PREVIEW.command").write_text(
    '#!/bin/sh\n'
    'cd "$(dirname "$0")"\n'
    'python3 private-preview-server.py\n',
    encoding="utf-8",
)
(out / "READ_ME_FIRST.txt").write_text(
    "Xiang's Blog: PRIVATE local preview\n"
    "==================================\n\n"
    "This package is NOT published to GitHub Pages or any public URL.\n"
    "Unpublished draft demonstration articles may be included.\n\n"
    "Windows: extract ALL files, double-click START_PRIVATE_PREVIEW.bat.\n"
    "macOS/Linux: from the extracted folder, run:\n"
    "    python3 private-preview-server.py\n\n"
    "Your browser will open the Chinese homepage automatically.\n"
    "Use the website's language toggle to switch to English.\n"
    "Close the terminal window or press Ctrl+C to stop.\n"
    "Python 3 is required; no Node.js or npm install is needed to view.\n"
    "Search, archive, math, and theme switches work on localhost.\n"
    "Giscus comments are not configured and remain inactive.\n\n"
    "This is a private development snapshot, not a public launch.\n",
    encoding="utf-8",
)
print(f"Private local preview packaged in {out}")
