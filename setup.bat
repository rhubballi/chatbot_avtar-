@echo off
echo Installing Node.js dependencies...
npm install

echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Creating audio directory if it doesn't exist...
if not exist audio mkdir audio

echo.
echo Setup complete! Run 'npm start' to start the server.
echo Then open http://localhost:3000 in your browser.
echo.
pause