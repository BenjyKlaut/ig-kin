// backend/utils/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

/**
 * Démarre le serveur Express pour le backend IG-PNC
 * @param {Object} opts - Options de configuration
 * @param {string} opts.dbPath - Chemin vers le fichier de base de données SQLite
 * @param {number} opts.port - Port d'écoute
 * @returns {Promise<{server: Object, port: number, db: Object}>}
 */
async function startServer(opts = {}) {
  // Initialisation de la connexion à la base de données
  const initDb = require("./db");
  const db = await initDb({ dbPath: opts.dbPath });

  // Création de l'application Express
  const app = express();
  app.use(cors()); // Active CORS pour la communication avec le frontend
  app.use(bodyParser.json()); // Analyse les corps de requête JSON

  // Montage des routes API
  app.use("/auth", require("./routes/auth")(db)); // Routes d'authentification
  app.use("/reports", require("./routes/reports")(db)); // Routes de gestion des rapports
  app.use("/audit", require("./routes/audit")(db)); // Routes des logs d'audit
  app.get("/health", (req, res) => res.json({ ok: true })); // Point de terminaison de vérification de santé

  // Sert les fichiers de build React en production
  const reactBuildPath = path.join(__dirname, "..", "client", "react", "dist");
  app.use(express.static(reactBuildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(reactBuildPath, "index.html"));
  });

  // Détermination du port
  const PORT = opts.port || process.env.PORT || 3001;

  // Démarrage du serveur et retour de la promesse
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(PORT, () => {
        console.log(`Backend listening on ${PORT}`);
        resolve({ server, port: PORT, db });
      });

      // Gestion des erreurs serveur
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(`Erreur : Le port ${PORT} est déjà utilisé`);
          process.exit(1);
        } else {
          console.error("Erreur serveur:", err);
          reject(err);
        }
      });

      // Ajout d'une méthode stop pour un arrêt gracieux
      server.stop = () => new Promise((res) => server.close(() => res()));
    } catch (err) {
      reject(err);
    }
  });
}

// Si ce fichier est exécuté directement (pas requis en tant que module), démarre le serveur
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = { startServer };
