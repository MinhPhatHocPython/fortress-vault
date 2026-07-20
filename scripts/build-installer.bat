@echo off
set CSC_LINK=
set CSC_KEY_PASSWORD=
set WIN_CSC_LINK=
set WIN_CSC_KEY_PASSWORD=
cd /d "%~dp0.."
npx electron-builder --win portable --config electron-builder.yml
echo Exit code: %ERRORLEVEL%
