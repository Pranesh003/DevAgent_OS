@echo off
echo ===================================================
echo Agents Unleashed - Production Launcher
echo ===================================================

echo Starting Node.js Backend (Port 5000)...
start "Agents Backend (Prod)" cmd /k "cd backend && set NODE_ENV=production && node server.js"

echo Starting Python Orchestrator (Port 8000)...
start "Agents Orchestrator (Prod)" cmd /k "cd orchestrator && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js Frontend (Port 3000)...
start "Agents Frontend (Prod)" cmd /k "cd frontend && set NODE_ENV=production && npm run start"

echo.
echo All services have been launched in separate windows.
echo Please wait a few seconds for them to boot up.
echo Then open your browser and navigate to: http://localhost:3000
echo.
echo You can close this window now.
pause
