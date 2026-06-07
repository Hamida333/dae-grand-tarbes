@echo off
chcp 65001 >nul 2>&1
title DAE Grand Tarbes - Deploiement

echo.
echo  ========================================
echo   DAE GRAND TARBES - Deploiement Vercel
echo  ========================================
echo.
echo  Ce script va :
echo   1. Installer Git si absent
echo   2. Installer Node.js si absent
echo   3. Envoyer le code sur GitHub
echo   4. Deployer sur Vercel
echo.
echo  Appuyez sur une touche pour commencer...
pause >nul

:: ----------------------------------------
:: ETAPE 1 - Git
:: ----------------------------------------
echo.
echo [1/5] Verification de Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo     Git absent - installation en cours...
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo     Git installe !
) else (
    echo     Git OK
)

:: ----------------------------------------
:: ETAPE 2 - Node.js
:: ----------------------------------------
echo.
echo [2/5] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo     Node.js absent - installation en cours...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo     Node.js installe !
) else (
    echo     Node.js OK
)

:: ----------------------------------------
:: ETAPE 3 - Trouver le projet
:: ----------------------------------------
echo.
echo [3/5] Localisation du projet...

set "PROJ=%USERPROFILE%\Desktop\dae-grand-tarbes"
if not exist "%PROJ%\vercel.json" set "PROJ=%USERPROFILE%\Documents\dae-grand-tarbes"
if not exist "%PROJ%\vercel.json" set "PROJ=%USERPROFILE%\Downloads\dae-grand-tarbes"
if not exist "%PROJ%\vercel.json" (
    echo.
    echo     Projet non trouve automatiquement.
    set /p PROJ="    Chemin du dossier dae-grand-tarbes : "
)

if not exist "%PROJ%\vercel.json" (
    echo.
    echo  ERREUR : dossier projet introuvable.
    echo  Dezippez dae-grand-tarbes.zip sur le Bureau puis relancez.
    pause
    exit /b 1
)

echo     Projet trouve : %PROJ%
cd /d "%PROJ%"

:: ----------------------------------------
:: ETAPE 4 - Git init et GitHub
:: ----------------------------------------
echo.
echo [4/5] Configuration Git...
echo.

if not exist ".git" git init

set /p GIT_NAME="    Votre prenom et nom : "
set /p GIT_EMAIL="    Votre email GitHub : "
git config user.name "%GIT_NAME%"
git config user.email "%GIT_EMAIL%"

git add .
git commit -m "Initial commit DAE Grand Tarbes" >nul 2>&1

echo.
echo  Ouverture de GitHub dans le navigateur...
echo  Connectez-vous puis :
echo   1. Cliquez "New repository" (bouton vert ou + en haut)
echo   2. Nom : dae-grand-tarbes
echo   3. Visibilite : Public
echo   4. NE PAS cocher README
echo   5. Cliquez "Create repository"
echo   6. Copiez l URL .git affichee
echo.
start https://github.com/new
echo.
set /p GITHUB_URL="    Collez l URL GitHub (.git) : "

if not "%GITHUB_URL%"=="" (
    git remote remove origin >nul 2>&1
    git remote add origin "%GITHUB_URL%"
    git branch -M main
    echo.
    echo     Envoi du code vers GitHub...
    git push -u origin main
    if %errorlevel% equ 0 (
        echo     Code envoye sur GitHub !
    ) else (
        echo     Echec push - continuez quand meme, vous pourrez repousser plus tard.
    )
)

:: ----------------------------------------
:: ETAPE 5 - Vercel
:: ----------------------------------------
echo.
echo [5/5] Installation et deploiement Vercel...
echo.
npm install -g vercel >nul 2>&1
echo     Vercel CLI installe

echo.
echo  Connexion a votre compte Vercel :
echo  (Si pas de compte : vercel.com/signup avec votre compte GitHub)
echo.
vercel login
if %errorlevel% neq 0 (
    echo  Echec connexion Vercel.
    pause
    exit /b 1
)

echo.
echo     Deploiement en cours...
vercel --yes --name dae-grand-tarbes

:: Variables d environnement
echo.
echo  ========================================
echo   CONFIGURATION MOT DE PASSE ADMIN
echo  ========================================
echo.
:pwd
set /p APWD="    Choisissez un mot de passe admin (min 6 car.) : "
if "%APWD%"=="" goto pwd

echo %APWD%| vercel env add ADMIN_PASSWORD production
echo     Mot de passe admin configure

echo.
echo     Deploiement final avec variables...
vercel --prod --yes

:: Recap
echo.
echo  ========================================
echo   TERMINE !
echo  ========================================
echo.
echo   Site : https://dae-grand-tarbes.vercel.app
echo   Admin: https://dae-grand-tarbes.vercel.app/admin/
echo   Mdp  : %APWD%
echo.
echo   Ces infos sont sauvegardees dans DAE-infos.txt sur le Bureau
echo.

(
echo URL : https://dae-grand-tarbes.vercel.app
echo Admin : https://dae-grand-tarbes.vercel.app/admin/
echo Mot de passe : %APWD%
echo GitHub : %GITHUB_URL%
echo Date : %DATE%
) > "%USERPROFILE%\Desktop\DAE-infos.txt"

set /p OPN="    Ouvrir le site maintenant ? (O/N) : "
if /i "%OPN%"=="O" start https://dae-grand-tarbes.vercel.app

echo.
pause
