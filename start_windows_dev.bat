@echo off
echo ===================================================
echo Agents Unleashed - Development Launcher
echo ===================================================

echo Starting Node.js Backend (nodemon)...
start "Agents Backend (Dev)" cmd /k "cd backend && npm run dev"

echo Starting Python Orchestrator (reload)...
start "Agents Orchestrator (Dev)" cmd /k "cd orchestrator && python -m uvicorn main:app --port 8000 --reload"

echo Starting Next.js Frontend (dev)...
start "Agents Frontend (Dev)" cmd /k "cd frontend && npm run dev"

echo.
echo Development servers started in separate windows!
echo Open http://localhost:3000 in your browser.
pause
