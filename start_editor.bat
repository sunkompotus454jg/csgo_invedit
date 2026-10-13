@echo off
title CS:GO Inventory Editor Local Server
cd /d "%~dp0"
echo ========================================================
echo  CS:GO Local Inventory Editor
echo ========================================================
echo.
echo Make sure config.txt in your game folder has:
echo "inventory_editor_origin" "http://localhost:8080"
echo.
echo Starting local web server on port 8080...
echo Opening browser...
start "" "http://localhost:8080"
python -m http.server 8080
pause
