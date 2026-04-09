// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateMiddleware = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret-change-me";

// Stockage des refresh tokens actifs (en production, utiliser Redis)
const { activeRefreshTokens } = authenticateMiddleware;

module.exports = function (db) {
  const router = express.Router();

  // POST /auth/login - Authentification et émission des tokens
  router.post("/login", async (req, res) => {
    try {
      const { matricule, password } = req.body;
      if (!matricule || !password)
        return res
          .status(400)
          .json({ error: "matricule and password required" });

      const user = await db.get(
        "SELECT * FROM users WHERE matricule = ?",
        matricule
      );
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      // Payload utilisateur commun
      const userPayload = {
        id: user.id,
        matricule: user.matricule,
        display_name: user.display_name,
        role: user.role,
      };

      // Access token - court terme (15 minutes)
      const accessToken = jwt.sign(userPayload, ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
      });

      // Refresh token - long terme (24 heures)
      const refreshToken = jwt.sign(userPayload, REFRESH_TOKEN_SECRET, {
        expiresIn: "24h",
      });

      // Stocker le refresh token comme actif
      activeRefreshTokens.add(refreshToken);

      res.json({
        accessToken,
        refreshToken,
        user: userPayload,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /auth/refresh - Renouveler l'access token
  router.post("/refresh", (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      // Vérifier que le refresh token est encore actif
      if (!activeRefreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Refresh token invalid or revoked" });
      }

      // Vérifier la signature et validité du refresh token
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

      // Générer un nouveau access token
      const newAccessToken = jwt.sign(
        {
          id: payload.id,
          matricule: payload.matricule,
          display_name: payload.display_name,
          role: payload.role,
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error("Refresh error:", err);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  // POST /auth/logout - Invalider le refresh token
  router.post("/logout", (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        activeRefreshTokens.delete(refreshToken);
      }
      // Répondre 204 No Content (standard pour logout)
      res.status(204).send();
    } catch (err) {
      console.error("Logout error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
