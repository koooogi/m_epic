@echo off
chcp 65001 >nul
title Music Player

echo.
echo ========================================
echo    🎵  MUSIC PLAYER  🎵
echo ========================================
echo.

set JAVA_EXE="C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin\java.exe"

if not exist %JAVA_EXE% (
    echo [ERROR] Java 21 not found!
    pause
    exit /b
)

if not exist target\m_epic-1.0-SNAPSHOT.jar (
    echo [ERROR] JAR not found!
    echo Run: mvn clean package
    pause
    exit /b
)

echo [OK] Java version:
%JAVA_EXE% -version
echo.

echo [OK] Starting Music Player...
echo.

REM Путь к JavaFX (Maven репозиторий)
set JAVAFX_PATH="C:\Users\kortn\.m2\repository\org\openjfx\javafx-base\21.0.1\javafx-base-21.0.1-win.jar"
set JAVAFX_CONTROLS="C:\Users\kortn\.m2\repository\org\openjfx\javafx-controls\21.0.1\javafx-controls-21.0.1-win.jar"
set JAVAFX_MEDIA="C:\Users\kortn\.m2\repository\org\openjfx\javafx-media\21.0.1\javafx-media-21.0.1-win.jar"
set JAVAFX_FXML="C:\Users\kortn\.m2\repository\org\openjfx\javafx-fxml\21.0.1\javafx-fxml-21.0.1-win.jar"
set JAVAFX_GRAPHICS="C:\Users\kortn\.m2\repository\org\openjfx\javafx-graphics\21.0.1\javafx-graphics-21.0.1-win.jar"

%JAVA_EXE% --module-path "%JAVAFX_PATH%;%JAVAFX_CONTROLS%;%JAVAFX_MEDIA%;%JAVAFX_FXML%;%JAVAFX_GRAPHICS%" --add-modules javafx.base,javafx.controls,javafx.media,javafx.fxml,javafx.graphics -jar target\m_epic-1.0-SNAPSHOT.jar

pause