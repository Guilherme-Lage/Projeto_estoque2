@echo off
title SERVIDOR HONTEC - LOGISTICA
mode con: cols=60 lines=15
color 0b
echo ===============================================
echo        SISTEMA HONTEC - INICIANDO...
echo ===============================================
cd /d "%~dp0"
node server.js
pause