@echo off
echo ===================================================
echo Agents Unleashed - Windows Production Build
echo ===================================================

echo.
echo [1/3] Building Next.js Frontend...
cd frontend
call npm install
call npm run build
cd ..

echo.
echo [2/3] Installing Backend Production Dependencies...
cd backend
call npm install --omit=dev
cd ..

echo.
echo [3/3] Installing Orchestrator Dependencies...
cd orchestrator
call pip install -r requirements.txt
cd ..

echo.
echo ===================================================
echo Build Complete! 
echo Use start_windows_prod.bat to launch the services.
echo ===================================================
pause
