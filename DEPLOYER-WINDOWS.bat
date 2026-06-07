@echo off
chcp 65001 >nul
title DAE Grand Tarbes — Déploiement automatique

color 0F
echo.
echo  ██████╗  █████╗ ███████╗    ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
echo  ██╔══██╗██╔══██╗██╔════╝    ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
echo  ██║  ██║███████║█████╗      ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ 
echo  ██║  ██║██╔══██║██╔══╝      ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  
echo  ██████╔╝██║  ██║███████╗    ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   
echo  ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   
echo.
echo  Grand Tarbes ^| Carte collaborative des defibrillateurs DAE
echo  Script de deploiement automatique Windows
echo  ════════════════════════════════════════════════════════════
echo.
pause

:: ════════════════════════════════════════════════
:: ETAPE 0 — Vérifier les droits administrateur
:: ════════════════════════════════════════════════
echo [0/6] Verification des droits...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ATTENTION : Ce script necessite les droits administrateur
    echo  Clic droit sur le fichier ^> "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)
echo       OK - Droits administrateur confirmes
echo.

:: ════════════════════════════════════════════════
:: ETAPE 1 — Installer Git si absent
:: ════════════════════════════════════════════════
echo [1/6] Verification de Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo       Git non detecte. Installation via winget...
    winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo  Echec installation automatique de Git.
        echo  Telechargez-le manuellement : https://git-scm.com/download/win
        echo  Puis relancez ce script.
        pause
        exit /b 1
    )
    :: Recharger PATH
    call refreshenv >nul 2>&1
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo       Git installe avec succes !
) else (
    for /f "tokens=3" %%v in ('git --version 2^>^&1') do echo       Git %%v detecte - OK
)
echo.

:: ════════════════════════════════════════════════
:: ETAPE 2 — Installer Node.js si absent
:: ════════════════════════════════════════════════
echo [2/6] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo       Node.js non detecte. Installation via winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo  Echec installation automatique de Node.js.
        echo  Telechargez-le manuellement : https://nodejs.org/fr/download/
        echo  Puis relancez ce script.
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo       Node.js installe avec succes !
) else (
    for /f %%v in ('node --version 2^>^&1') do echo       Node.js %%v detecte - OK
)
echo.

:: ════════════════════════════════════════════════
:: ETAPE 3 — Localiser le dossier du projet
:: ════════════════════════════════════════════════
echo [3/6] Localisation du projet DAE...
echo.

:: Chercher automatiquement le dossier dae-grand-tarbes
set "PROJECT_DIR="

:: Chercher sur le Bureau
if exist "%USERPROFILE%\Desktop\dae-grand-tarbes\vercel.json" (
    set "PROJECT_DIR=%USERPROFILE%\Desktop\dae-grand-tarbes"
    echo       Projet trouve sur le Bureau !
)

:: Chercher dans Documents
if not defined PROJECT_DIR (
    if exist "%USERPROFILE%\Documents\dae-grand-tarbes\vercel.json" (
        set "PROJECT_DIR=%USERPROFILE%\Documents\dae-grand-tarbes"
        echo       Projet trouve dans Documents !
    )
)

:: Chercher dans Téléchargements
if not defined PROJECT_DIR (
    if exist "%USERPROFILE%\Downloads\dae-grand-tarbes\vercel.json" (
        set "PROJECT_DIR=%USERPROFILE%\Downloads\dae-grand-tarbes"
        echo       Projet trouve dans Telechargements !
    )
)

:: Demander manuellement si non trouvé
if not defined PROJECT_DIR (
    echo       Projet non trouve automatiquement.
    echo.
    echo  Ou avez-vous dezippé le fichier dae-grand-tarbes.zip ?
    echo  Exemples :
    echo    C:\Users\VotreNom\Desktop\dae-grand-tarbes
    echo    C:\Users\VotreNom\Documents\dae-grand-tarbes
    echo.
    set /p PROJECT_DIR="  Chemin complet du dossier : "
)

if not exist "%PROJECT_DIR%\vercel.json" (
    echo.
    echo  ERREUR : Le dossier "%PROJECT_DIR%" ne contient pas le projet DAE.
    echo  Verifiez que vous avez bien dezippé dae-grand-tarbes.zip
    echo.
    pause
    exit /b 1
)

echo       Projet localise : %PROJECT_DIR%
cd /d "%PROJECT_DIR%"
echo.

:: ════════════════════════════════════════════════
:: ETAPE 4 — Configurer Git et créer le dépôt GitHub
:: ════════════════════════════════════════════════
echo [4/6] Configuration Git et depot GitHub...
echo.

:: Vérifier si déjà un dépôt Git
if exist ".git" (
    echo       Depot Git deja initialise - OK
) else (
    git init
    echo       Depot Git initialise
)

:: Configurer l'identité Git
echo.
echo  ┌─────────────────────────────────────────────┐
echo  │  Configuration de votre identite Git         │
echo  │  (utilisee pour les commits GitHub)          │
echo  └─────────────────────────────────────────────┘
echo.
set /p GIT_NAME="  Votre prenom et nom : "
set /p GIT_EMAIL="  Votre adresse email (compte GitHub) : "
git config user.name "%GIT_NAME%"
git config user.email "%GIT_EMAIL%"
echo.
echo       Identite configuree : %GIT_NAME% ^<%GIT_EMAIL%^>
echo.

:: Premier commit
git add .
git status --short
echo.
git commit -m "Initial commit - DAE Grand Tarbes v1.0" >nul 2>&1
if %errorlevel% neq 0 (
    git commit --allow-empty -m "Initial commit - DAE Grand Tarbes v1.0"
)
echo       Commit initial cree
echo.

:: Créer le dépôt GitHub via GitHub CLI ou browser
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Creation du depot GitHub                                │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo  Nous allons ouvrir GitHub dans votre navigateur.
echo  Connectez-vous si ce n'est pas deja fait, puis :
echo.
echo    1. Cliquez le bouton vert "New repository"  (ou bouton + en haut a droite)
echo    2. Nom du depot    : dae-grand-tarbes
echo    3. Visibilite      : Public (recommande pour Vercel gratuit)
echo    4. NE PAS cocher   : "Add a README file" (laissez tout vide)
echo    5. Cliquez         : "Create repository"
echo    6. Copiez l'URL    : https://github.com/VOTRE-NOM/dae-grand-tarbes.git
echo.
pause
start https://github.com/new?name=dae-grand-tarbes^&description=Carte+collaborative+des+d%C3%A9fibrillateurs+DAE+-+Grand+Tarbes+%2F+Lourdes^&visibility=public
echo.
set /p GITHUB_URL="  Collez l'URL de votre depot GitHub (ex: https://github.com/jean-dupont/dae-grand-tarbes.git) : "

if "%GITHUB_URL%"=="" (
    echo  URL non saisie - etape GitHub ignoree
) else (
    git remote remove origin >nul 2>&1
    git remote add origin "%GITHUB_URL%"
    git branch -M main

    echo.
    echo       Push vers GitHub en cours...
    echo       (Une fenetre de connexion GitHub peut apparaitre)
    echo.
    git push -u origin main
    if %errorlevel% neq 0 (
        echo.
        echo  Si la connexion a echoue, ouvrez VS Code dans ce dossier
        echo  et utilisez l'extension GitHub pour vous authentifier.
        echo.
    ) else (
        echo.
        echo       Code envoye sur GitHub avec succes !
    )
)
echo.

:: ════════════════════════════════════════════════
:: ETAPE 5 — Installer Vercel CLI et déployer
:: ════════════════════════════════════════════════
echo [5/6] Installation de Vercel CLI...
echo.
npm install -g vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo  Tentative alternative...
    npm install -g vercel
)
echo       Vercel CLI installe
echo.

:: ════════════════════════════════════════════════
:: ETAPE 6 — Déployer sur Vercel
:: ════════════════════════════════════════════════
echo [6/6] Deploiement sur Vercel...
echo.
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Connexion a votre compte Vercel                         │
echo  │  Une fenetre de navigateur va s'ouvrir                   │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo  Si vous n'avez pas de compte Vercel, creez-en un gratuitement sur :
echo  https://vercel.com/signup (connexion recommandee avec GitHub)
echo.
pause

vercel login
if %errorlevel% neq 0 (
    echo  Connexion Vercel echouee - verifiez votre email/mot de passe
    pause
    exit /b 1
)
echo.
echo       Connexion Vercel reussie !
echo.

echo  Deploiement en cours (environ 30 secondes)...
echo.
vercel --yes --name dae-grand-tarbes

if %errorlevel% neq 0 (
    echo.
    echo  Echec du deploiement. Essai avec options supplementaires...
    vercel deploy --yes
)

echo.

:: ════════════════════════════════════════════════
:: CONFIGURATION DES VARIABLES D'ENVIRONNEMENT
:: ════════════════════════════════════════════════
echo.
echo  ════════════════════════════════════════════════════════════
echo  CONFIGURATION DES VARIABLES D'ENVIRONNEMENT
echo  ════════════════════════════════════════════════════════════
echo.
echo  Nous allons configurer les variables necessaires au fonctionnement.
echo  Appuyez sur Entree pour passer une variable optionnelle.
echo.

:: Mot de passe admin (obligatoire)
:ask_admin_pwd
set /p ADMIN_PWD="  [OBLIGATOIRE] Mot de passe admin (minimum 8 caracteres) : "
if "%ADMIN_PWD%"=="" (
    echo  Le mot de passe admin est obligatoire !
    goto ask_admin_pwd
)
if "%ADMIN_PWD%"=="admin123" (
    echo  ATTENTION : Changez ce mot de passe par defaut !
    set /p ADMIN_PWD="  Nouveau mot de passe : "
)
vercel env add ADMIN_PASSWORD production <<< "%ADMIN_PWD%" >nul 2>&1
echo %ADMIN_PWD% | vercel env add ADMIN_PASSWORD production >nul 2>&1
echo       ADMIN_PASSWORD configure

:: Airtable (optionnel)
echo.
echo  [OPTIONNEL] Airtable - base de donnees collaborative
echo  Laissez vide pour utiliser les donnees locales pour l'instant
set /p AT_TOKEN="  AIRTABLE_TOKEN (patXXXX...) : "
if not "%AT_TOKEN%"=="" (
    echo %AT_TOKEN% | vercel env add AIRTABLE_TOKEN production >nul 2>&1
    echo       AIRTABLE_TOKEN configure
)
set /p AT_BASE="  AIRTABLE_BASE_ID (appXXXX...) : "
if not "%AT_BASE%"=="" (
    echo %AT_BASE% | vercel env add AIRTABLE_BASE_ID production >nul 2>&1
    echo       AIRTABLE_BASE_ID configure
)

:: Email (optionnel)
echo.
echo  [OPTIONNEL] Email notifications (via Resend - gratuit)
set /p RESEND_KEY="  RESEND_API_KEY (re_XXXX...) : "
if not "%RESEND_KEY%"=="" (
    echo %RESEND_KEY% | vercel env add RESEND_API_KEY production >nul 2>&1
    echo       RESEND_API_KEY configure
)
set /p ADMIN_EMAIL="  ADMIN_EMAIL (votre@email.fr) : "
if not "%ADMIN_EMAIL%"=="" (
    echo %ADMIN_EMAIL% | vercel env add ADMIN_EMAIL production >nul 2>&1
    echo       ADMIN_EMAIL configure
)

:: Redéployer avec les variables d'environnement
echo.
echo  Redéploiement avec les variables d'environnement...
vercel --prod --yes >nul 2>&1

:: ════════════════════════════════════════════════
:: RÉSUMÉ FINAL
:: ════════════════════════════════════════════════
echo.
color 0A
echo  ════════════════════════════════════════════════════════════
echo.
echo   DEPLOIEMENT TERMINE AVEC SUCCES !
echo.
echo  ════════════════════════════════════════════════════════════
echo.
echo   Votre application DAE Grand Tarbes est en ligne !
echo.
echo   Carte citoyenne   : https://dae-grand-tarbes.vercel.app
echo   Interface admin   : https://dae-grand-tarbes.vercel.app/admin/
echo   Mot de passe admin: %ADMIN_PWD%
echo.
echo   SAUVEGARDEZ CES INFORMATIONS !
echo.
echo  ════════════════════════════════════════════════════════════
echo.
echo   Prochaines etapes :
echo   1. Ouvrez la carte dans votre navigateur
echo   2. Connectez Airtable pour la base de donnees collaborative
echo   3. Partagez l'URL avec les secouristes du Grand Tarbes
echo.
echo  ════════════════════════════════════════════════════════════
echo.

:: Ouvrir automatiquement le site
set /p OPEN_SITE="  Ouvrir le site dans le navigateur maintenant ? (O/N) : "
if /i "%OPEN_SITE%"=="O" (
    start https://dae-grand-tarbes.vercel.app
    start https://vercel.com/dashboard
)

:: Créer un fichier récapitulatif sur le Bureau
echo DAE Grand Tarbes — Informations de deploiement > "%USERPROFILE%\Desktop\DAE-infos.txt"
echo. >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Date de deploiement : %DATE% %TIME% >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo. >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo URL de l'application  : https://dae-grand-tarbes.vercel.app >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Interface admin       : https://dae-grand-tarbes.vercel.app/admin/ >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Mot de passe admin    : %ADMIN_PWD% >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo. >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Depot GitHub          : %GITHUB_URL% >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Dossier projet        : %PROJECT_DIR% >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo. >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo Pour mettre a jour le site apres modification : >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo   cd %PROJECT_DIR% >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo   git add . >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo   git commit -m "Mise a jour" >> "%USERPROFILE%\Desktop\DAE-infos.txt"
echo   git push >> "%USERPROFILE%\Desktop\DAE-infos.txt"

echo.
echo   Un fichier "DAE-infos.txt" a ete cree sur votre Bureau
echo   avec toutes vos informations de connexion.
echo.
echo  ════════════════════════════════════════════════════════════
echo.
pause
