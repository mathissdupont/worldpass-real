# Start Backend
Write-Host "Starting Backend on port 8000..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& .venv\Scripts\Activate.ps1; uvicorn backend.app:app --reload --port 8000"

# Start Frontend
Write-Host "Starting Frontend on port 5173..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd web; npm run dev"

Write-Host "System is starting up!"
Write-Host "Backend: http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:5173"
