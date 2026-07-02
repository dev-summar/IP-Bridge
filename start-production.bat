@echo off
cd /d "%~dp0"
echo Building Patentbaazar...
call npm run build
if errorlevel 1 exit /b 1
set NODE_ENV=production
echo Starting production server on http://localhost:5000
npm start
