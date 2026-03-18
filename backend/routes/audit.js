// server/routes/audit.js
const express = require("express");
const authMiddleware = require("../middleware/auth");

module.exports = function (db) {
  const router = express.Router();

  // GET /audit?user_id=...&report_id=...
  router.get("/", authMiddleware, async (req, res) => {
    try {
      // Seuls les administrateurs sont autorisés
      if (req.user.role !== "admin")
        return res.status(403).json({ error: "forbidden" });

      const { user_id, report_id, limit = 100 } = req.query;
      let where = [];
      let params = [];

      if (user_id) {
        where.push("user_id = ?");
        params.push(user_id);
      }
      if (report_id) {
        where.push("report_id = ?");
        params.push(report_id);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

      const rows = await db.all(
        `SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ?`,
        ...params,
        limit,
      );

      res.json(rows);
    } catch (err) {
      console.error("Audit fetch error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
