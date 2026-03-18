// electron-main.js
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let backendHandle = null;

/**
 * Démarre le serveur backend.
 * Configure le chemin de la base de données et le port.
 * Charge le module backend et lance le serveur.
 * Gère les erreurs de démarrage.
 * @return {Promise<void>}
 */
async function startBackend() {
  // Configuration du chemin de la base de données
  try {
    // Crée le répertoire de données si nécessaire
    const userDataPath = app.getPath("userData");
    const dbDir = path.join(userDataPath, "ig-kin");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "data.db");

    // Définit les variables d'environnement pour le backend
    process.env.DB_PATH = dbPath;
    process.env.PORT = process.env.PORT || "3001";

    // Charge et démarre le module backend
    const backendModulePath = path.join(__dirname, "backend", "app");
    const backend = require(backendModulePath);

    // Démarre le serveur backend
    if (typeof backend.startServer === "function") {
      console.log("Démarrage du backend...");
      // Lance le serveur avec les paramètres appropriés
      backendHandle = await backend.startServer({
        dbPath,
        port: Number(process.env.PORT),
      });
      console.log(
        "Backend démarré sur le port",
        backendHandle.port || process.env.PORT
      );
    } else {
      console.warn(
        "Le module backend n'expose pas startServer(). Vérifie backend/app.js"
      );
    }
  } catch (err) {
    console.error(
      "Erreur démarrage backend :",
      err && err.stack ? err.stack : err
    );
  }
}

/**
 * Crée la fenêtre principale de l'application.
 * Configure les options de la fenêtre et charge le contenu.
 * Gère les événements de la fenêtre.
 * @return {Promise<void>}
 */
async function createWindow() {
  const iconPath = path.join(__dirname, "assets", "favicon.ico");
  const preloadPath = path.join(__dirname, "preload.js");
  const hasPreload = fs.existsSync(preloadPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: hasPreload ? preloadPath : undefined,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // GESTION DU MENU ET DEVTOOLS (Auto-détection)
  if (app.isPackaged) {
    // EN PRODUCTION (Installé)
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);
  } else {
    // EN DÉVELOPPEMENT
    mainWindow.webContents.openDevTools({ mode: "right" });
  }

  // Chargement de l'URL
  if (!app.isPackaged && process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    // En prod, on charge le fichier compilé
    const indexPath = path.join(
      __dirname,
      "client",
      "react",
      "dist",
      "index.html"
    );
    // Utilisation de loadFile pour éviter les problèmes de protocoles file://
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Démarre l'application lorsque Electron est prêt
app.whenReady().then(async () => {
  await startBackend();
  await createWindow();

  // Sur macOS, recrée une fenêtre si l'icône du dock est cliquée et qu'il n'y a pas de fenêtres ouvertes
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quitte l'application lorsque toutes les fenêtres sont fermées
app.on("window-all-closed", async function () {
  try {
    // Tente d'arrêter proprement le serveur backend
    if (backendHandle && backendHandle.server) {
      // Vérifie et appelle la méthode d'arrêt appropriée
      if (typeof backendHandle.server.stop === "function") {
        await backendHandle.server.stop();
      } else if (typeof backendHandle.server.close === "function") {
        await new Promise((res) => backendHandle.server.close(res));
      }
      console.log("Backend arrêté proprement.");
    }
  } catch (e) {
    console.warn("Erreur lors de l'arrêt du backend :", e && e.message);
  }

  // Quitte l'application sur les plateformes autres que macOS
  if (process.platform !== "darwin") app.quit();
});
