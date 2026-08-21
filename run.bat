@echo off
chcp 65001 >nul
title Music Player Web

echo.
echo ========================================
echo    🎵  MUSIC PLAYER WEB  🎵
echo ========================================
echo.

set JAVA_EXE="C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin\java.exe"

if not exist %JAVA_EXE% (
    echo [ERROR] Java 21 not found!
    pause
    exit /b
)

if not exist target\m_epic_web-1.0-SNAPSHOT.jar (
    echo [ERROR] JAR not found!
    echo Run: mvn clean package
    pause
    exit /b
)

echo [OK] Starting Music Player Web...
echo [URL] http://localhost:8080
echo.

%JAVA_EXE% -jar target\m_epic_web-1.0-SNAPSHOT.jar

pause