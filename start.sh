#!/bin/bash

echo "Starting Next.js Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Starting FastAPI Backend..."
cd backend
source venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo "Both servers are running."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "Press Ctrl+C to stop both."

trap "kill $FRONTEND_PID $BACKEND_PID" SIGINT
wait
