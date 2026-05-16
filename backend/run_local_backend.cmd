@echo off
set "PYTHONPATH=%~dp0.pydeps"
set "PYTHONUNBUFFERED=1"
cd /d "%~dp0"
"C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log --timeout-keep-alive 5
