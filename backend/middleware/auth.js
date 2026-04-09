// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || JWT_SECRET;

// Stockage en mémoire des refresh tokens actifs (invalidés à redémarrage du serveur)
// En production, utiliser Redis ou une base de données
const activeRefreshTokens = new Set();

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Autorisation Manquante" });

  const parts = h.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Autorisation Invalide" });

  try {
    const payload = jwt.verify(parts[1], ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token Invalide" });
  }
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.activeRefreshTokens = activeRefreshTokens;
module.exports.ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET;
module.exports.JWT_SECRET = JWT_SECRET;
