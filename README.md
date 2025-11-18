# yTube-downloader

One-line: A Django web app and API to download YouTube videos and audio (built on yt-dlp/pytube).

Badges:
- Build / CI: ![CI](https://img.shields.io/badge/ci-not%20configured-lightgrey)
- License: ![License](https://img.shields.io/badge/license-Copyright%20Claimed%202025-red)
- Version: ![Version](https://img.shields.io/badge/version-0.1.0-blue)
- Python 3.9: [![Python 3.9](https://img.shields.io/badge/python-3.9-blue)](https://www.python.org/downloads/release/python-390/)

---

## Table of Contents
- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Authors](#authors)
- [Acknowledgements](#acknowledgements)

---

## About
yTube-downloader is a Django-based project that provides a simple web UI and REST API to download YouTube videos and extract audio. It delegates actual downloading to yt-dlp (recommended) or pytube and offers options for format, quality, and output path.

## Features
- Web interface to paste YouTube links and choose download options
- REST API endpoint for programmatic downloads
- Support for video and audio extraction (mp4, mp3, etc.)
- Queueing/basic task handling (if configured with Celery)
- Optional Docker support

## Demo
###IMAGES:
<img width="1263" height="851" alt="image" src="https://github.com/user-attachments/assets/2f12a9ab-3b51-4371-854c-6ff698557713" />
<img width="1262" height="849" alt="image" src="https://github.com/user-attachments/assets/293a7ca1-2f95-4e88-b983-03cf9892ba44" />
<img width="1278" height="842" alt="image" src="https://github.com/user-attachments/assets/418116e1-aa41-44ee-a95e-714a36b5f5cc" />
<img width="1279" height="761" alt="image" src="https://github.com/user-attachments/assets/0c7df8f0-217f-47e2-b637-838530d64c37" />
###VIDEO:
https://github.com/user-attachments/assets/4958c8b3-16d2-4e90-8148-078a958641bc



---

## Requirements
- Python 3.9 (download link at top)
- Django 4.x (or compatible)
- yt-dlp (recommended) or pytube
- ffmpeg (for audio conversion / trimming)
- (Optional) PostgreSQL / MySQL if not using SQLite
- (Optional) Redis + Celery for background tasks
- OS: macOS / Linux / Windows

---

## Installation (local)
1. Clone the repo:
```bash
git clone https://github.com/<owner>/<repo>.git
cd yTube-downloader
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
# macOS / Linux
source venv/bin/activate
# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
# ensure yt-dlp and ffmpeg are available on PATH
pip install yt-dlp
# or system package for ffmpeg, e.g. apt, brew or choco
```

4. Copy environment example and configure:
```bash
cp .env.example .env
# edit .env and set SECRET_KEY, DEBUG, DATABASE_URL, STORAGE_PATH, etc.
```

5. Apply migrations and create a superuser:
```bash
python manage.py migrate
python manage.py createsuperuser
```

6. Start the development server:
```bash
python manage.py runserver
# open http://127.0.0.1:8000/
```

---

## Configuration
Important environment variables (examples):
- SECRET_KEY — Django secret key
- DEBUG — 1 or 0
- ALLOWED_HOSTS — comma-separated hosts
- DATABASE_URL — eg. sqlite:///db.sqlite3 or postgres://user:pass@host:port/db
- STORAGE_PATH — filesystem path where downloads are stored (e.g. ./downloads)
- YT_DLP_PATH — (optional) path to yt-dlp binary, otherwise should be on PATH
- CELERY_BROKER_URL — for background task processing (optional)

Example .env.example:
```env
SECRET_KEY=replace-me
DEBUG=1
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
STORAGE_PATH=./downloads
```

Settings file locations:
- Django settings: ytdownloader/settings.py (or your project settings module)
- URLs: ytdownloader/urls.py
- App: downloader/ (views, models, api endpoints)

---

## Usage

Web UI
1. Start server: python manage.py runserver
2. Open http://127.0.0.1:8000/
3. Paste a YouTube URL, choose format (video / audio), and click Download.

REST API (example)
- Endpoint (example): POST /api/download/
- Body (JSON):
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "mp4",
  "quality": "best"
}
```
- Example curl:
```bash
curl -X POST http://127.0.0.1:8000/api/download/ \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID","format":"mp3"}'
```

Output files are saved under STORAGE_PATH (or shown as a downloadable link in the UI).

---

## Running with Docker (optional)
A Dockerfile and docker-compose.yml may be provided. Typical commands:
```bash
docker-compose build
docker-compose up
# or
docker build -t ytd-downloader .
docker run -p 8000:8000 --env-file .env ytd-downloader
```

---

## Development
Common tasks:
- Run dev server: python manage.py runserver
- Run migrations: python manage.py migrate
- Linting: flake8 / black (if configured)
- Format: black .

If using Celery:
```bash
celery -A ytdownloader worker -l info
```

---

## Testing
Run Django tests:
```bash
python manage.py test
```
Or if using pytest:
```bash
pytest
```

---

## Contributing
Thanks for considering contributing! Suggested workflow:
1. Fork the repo
2. Create a feature branch: git checkout -b feature/your-feature
3. Implement and test your changes
4. Commit and push, then open a Pull Request

Please follow the coding style used in the project and include tests for new functionality.

---

## Roadmap
- [ ] Playlist download support
- [ ] Authentication + per-user download quotas
- [ ] Background job monitoring UI
- [ ] Add unit + integration tests

---

## License
Copyright Claimed 2025 — All rights reserved.

This project is copyrightclaimed 2025. No open-source license is granted here unless explicitly stated elsewhere.

---

## Authors
- ali2develop — your-email@example.com
- Copilot (@copilot) — suggested helper badge added to README

---

## Acknowledgements
- yt-dlp (https://github.com/yt-dlp/yt-dlp)
- pytube (optional)
- Django docs and community
