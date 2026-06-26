@echo off
title Patentbaazar Launcher
echo =========================================================
echo 🚀 Launching Patentbaazar / PatentBridge Presentation Demo
echo =========================================================
echo.
echo [1/2] Launching backend and frontend servers via 'npm run dev'...
echo [2/2] Opening browser to http://localhost:3000...
echo.
start cmd /k "npm run dev"
echo Waiting 6 seconds for servers to initialize...
timeout /t 6 >nul
start http://localhost:3000
echo.
echo =========================================================
echo ✅ Presentation servers are running in a separate window.
echo Keep the new terminal window running.
echo Press any key to close this launcher.
echo =========================================================
pause >nul
