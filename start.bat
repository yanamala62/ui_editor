@echo off
chcp 65001 >nul 2>&1
set PYTHONIOENCODING=utf-8
title UILens - Starting All Services
echo.
echo  ============================================
echo   UILens - AI-Powered Live UI Observer
echo  ============================================
echo.
echo [5/5] Starting all services...
echo.
echo   Gateway:  http://localhost:8000 (AI proxy)
echo   Server:   http://localhost:3001 (Backend)
echo   Client:   http://localhost:5173 (React UI)
echo   Electron: Desktop window
echo.
echo  Press Ctrl+C to stop all services
echo  ============================================
echo.

npx concurrently -k -n "GATEWAY,SERVER,CLIENT,ELECTRON" -c "magenta,blue,green,yellow" ^
  "cd kiro-gateway && python main.py" ^
  "cd server && node index.js" ^
  "cd client && npx vite" ^
  "node electron/wait-and-launch.js"
