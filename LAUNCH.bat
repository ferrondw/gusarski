@echo off

call git pull
if %ERRORLEVEL% neq 0 (
    echo Git pull failed with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

call npm install
if %ERRORLEVEL% neq 0 (
    echo npm install failed with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

call npx playwright install
if %ERRORLEVEL% neq 0 (
    echo Playwright install failed with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

call node index.js
if %ERRORLEVEL% neq 0 (
    echo Application failed to start with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

pause