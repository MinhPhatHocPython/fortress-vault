@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   Fortress Vault - Build and Deploy Script
echo ===========================================
echo.

REM === B??c 1: Nh?p phi?n b?n m?i ===
set /p NEW_VERSION="Nhap version moi (VD: 1.0.1): "
if "%NEW_VERSION%"=="" (
    echo Loi: Ban phai nhap version!
    pause
    exit /b 1
)

echo.
echo === Buoc 1: Tang phien ban len %NEW_VERSION% ===
node scripts/bump-version.js %NEW_VERSION%
if errorlevel 1 (
    echo Loi: Khong the tang version!
    pause
    exit /b 1
)

REM === B??c 2: C?i ??t dependencies ===
echo.
echo === Buoc 2: Cai dat dependencies ===
call npm install
if errorlevel 1 (
    echo Loi: npm install that bai!
    pause
    exit /b 1
)

REM === B??c 3: Build to?n b? ?ng d?ng ===
echo.
echo === Buoc 3: Build ung dung ===
call npm run build
if errorlevel 1 (
    echo Loi: Build ung dung that bai!
    pause
    exit /b 1
)

REM === B??c 4: Build installer ===
echo.
echo === Buoc 4: Build installer ===
call npm run dist
if errorlevel 1 (
    echo Loi: Build installer that bai!
    pause
    exit /b 1
)

REM === B??c 5: Upload l?n server ===
echo.
echo === Buoc 5: Upload len server ===

set "LOCAL_DIR=release"

REM Domain m?c ??nh
if "%FTP_HOST%"=="" set "FTP_HOST=fortressvault.tech"
if "%REMOTE_PATH%"=="" set "REMOTE_PATH=/public_html/updates"

REM Ki?m tra th? m?c release
if not exist "%LOCAL_DIR%" (
    echo Loi: Khong tim thay thu muc release!
    pause
    exit /b 1
)

REM Li?t k? file s? upload
echo Cac file se duoc upload:
if exist "%LOCAL_DIR%\PasswordVault_Setup_v%NEW_VERSION%.exe" (
    echo   - PasswordVault_Setup_v%NEW_VERSION%.exe
) else (
    echo Canh bao: Khong tim thay installer file!
    dir /b "%LOCAL_DIR%\*.exe" 2>nul
)

if exist "%LOCAL_DIR%\latest.yml" echo   - latest.yml
if exist "%LOCAL_DIR%\RELEASES" echo   - RELEASES
if exist "%LOCAL_DIR%\latest-mac.yml" echo   - latest-mac.yml

echo.
echo Thiet lap thong tin server:

REM Ki?m tra file .env
if exist .env (
    echo Doc thong tin tu file .env...
    for /f "tokens=*" %%a in (.env) do set "%%a"
)

REM N?u ch?a c?, nh?p tay
if "%FTP_HOST%"=="" set /p FTP_HOST="FTP Host (VD: your-server.com): "
if "%FTP_USER%"=="" set /p FTP_USER="FTP Username: "
if "%FTP_PASS%"=="" set /p FTP_PASS="FTP Password: "
if "%REMOTE_PATH%"=="" set /p REMOTE_PATH="Remote path (VD: /public_html/updates): "

echo.
echo === Dang upload file len %FTP_HOST% ... ===

REM Upload t?ng file
set "UPLOAD_OK=1"

if exist "%LOCAL_DIR%\PasswordVault_Setup_v%NEW_VERSION%.exe" (
    echo Dang upload installer...
    curl -T "%LOCAL_DIR%\PasswordVault_Setup_v%NEW_VERSION%.exe" "ftp://%FTP_HOST%%REMOTE_PATH%/PasswordVault_Setup_v%NEW_VERSION%.exe" --user "%FTP_USER%:%FTP_PASS%" --retry 3 --retry-delay 2
    if errorlevel 1 (
        echo Loi upload installer!
        set "UPLOAD_OK=0"
    ) else (
        echo   OK: installer uploaded
    )
)

if exist "%LOCAL_DIR%\latest.yml" (
    curl -T "%LOCAL_DIR%\latest.yml" "ftp://%FTP_HOST%%REMOTE_PATH%/latest.yml" --user "%FTP_USER%:%FTP_PASS%" --retry 3 --retry-delay 2
    if errorlevel 1 (
        echo Canh bao: Khong the upload latest.yml
    ) else (
        echo   OK: latest.yml uploaded
    )
)

if exist "%LOCAL_DIR%\RELEASES" (
    curl -T "%LOCAL_DIR%\RELEASES" "ftp://%FTP_HOST%%REMOTE_PATH%/RELEASES" --user "%FTP_USER%:%FTP_PASS%" --retry 3 --retry-delay 2
    if errorlevel 1 (
        echo Canh bao: Khong the upload RELEASES
    ) else (
        echo   OK: RELEASES uploaded
    )
)

if exist "%LOCAL_DIR%\latest-mac.yml" (
    curl -T "%LOCAL_DIR%\latest-mac.yml" "ftp://%FTP_HOST%%REMOTE_PATH%/latest-mac.yml" --user "%FTP_USER%:%FTP_PASS%" --retry 3 --retry-delay 2
)

echo.
echo ===========================================
if "%UPLOAD_OK%"=="1" (
    echo  THANH CONG!
    echo  Phien ban %NEW_VERSION% da duoc build va deploy.
    echo  Nguoi dung se tu dong cap nhat khi mo app.
) else (
    echo  HOAN THANH (co loi upload).
    echo  Kiem tra lai thong tin server va chay lai.
)
echo ===========================================
echo.
pause
