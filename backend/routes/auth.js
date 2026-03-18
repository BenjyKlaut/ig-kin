// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

module.exports = function (db) {
  const router = express.Router();

  // POST /auth/login
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

      const token = jwt.sign(
        {
          id: user.id,
          matricule: user.matricule,
          display_name: user.display_name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      res.json({ token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
