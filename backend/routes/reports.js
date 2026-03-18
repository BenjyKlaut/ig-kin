// server/routes/reports.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/auth");

/**
 * Module des routes des rapports
 * Gère tous les points de terminaison API liés aux rapports incluant les opérations CRUD et les rapports groupés
 * @param {Object} db - Connexion à la base de données SQLite
 * @returns {Object} Routeur Express
 */
module.exports = function (db) {
  const router = express.Router();

  // Créer un raport
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const body = req.body;

      // Validation requise
      if (
        !body.numero_rapport ||
        !body.district ||
        !body.commune ||
        !body.date_faits
      ) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }

      // Vérifier qu'au moins une situation est remplie
      const situationData = body.situation || {};
      if (
        Object.keys(situationData).length === 0 ||
        !Object.values(situationData).some((v) => v && v.trim() !== "")
      ) {
        return res
          .status(400)
          .json({ error: "Au moins une situation doit être remplie" });
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO reports (
           id, author_id, numero_rapport, district, commune, quartier, date_faits,
           situation, resume, contenu, degats, mesures_prises, created_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        req.user.id,
        body.numero_rapport,
        body.district,
        body.commune,
        body.quartier || null,
        body.date_faits,
        JSON.stringify(body.situation || {}),
        body.resume || null,
        body.contenu || null,
        JSON.stringify(body.degats || {}),
        JSON.stringify(body.mesures_prises || {}),
        now,
      );

      // Journal d'audit
      const auditId = uuidv4();
      await db.run(
        "INSERT INTO audit_logs(id, user_id, report_id, action, action_data, ip_address, created_at) VALUES (?,?,?,?,?,?,?)",
        auditId,
        req.user.id,
        id,
        "CREATE_REPORT",
        JSON.stringify({ summary: body.resume || "" }),
        req.ip,
        now,
      );

      res.json({ id });
    } catch (err) {
      console.error("Create report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Recherche de rapports (multi-critères + pagination)
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const {
        numero_rapport,
        district,
        commune,
        quartier,
        type_situation,
        type_degats, // optionnel: recherche dans la chaîne JSON degats
        date_faits, // recherche de date exacte
        date_debut,
        date_fin,
        page = 1,
        pageSize = 50,
      } = req.query;

      let where = [];
      let params = [];

      if (numero_rapport) {
        where.push("numero_rapport = ?");
        params.push(numero_rapport);
      }
      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (commune) {
        where.push("commune = ?");
        params.push(commune);
      }
      if (quartier) {
        where.push("quartier = ?");
        params.push(quartier);
      }
      if (type_situation) {
        where.push("situation LIKE ?");
        params.push(`%${type_situation}%`);
      }

      // filtre de date: date_faits exacte OU plage date_debut/date_fin
      if (date_faits) {
        where.push("date_faits = ?");
        params.push(date_faits);
      } else {
        if (date_debut) {
          where.push("date_faits >= ?");
          params.push(date_debut);
        }
        if (date_fin) {
          where.push("date_faits <= ?");
          params.push(date_fin);
        }
      }

      if (type_degats) {
        // recherche simple de sous-chaîne JSON dans la chaîne JSON degats
        where.push("degats LIKE ?");
        params.push(`%${type_degats}%`);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const offset = (page - 1) * pageSize;

      // Récupérer le nombre TOTAL de rapports correspondant au filtre
      const totalResult = await db.get(
        `SELECT COUNT(*) as count FROM reports ${whereSql}`,
        ...params,
      );
      const total = totalResult?.count || 0;

      const items = await db.all(
        `SELECT id, numero_rapport, date_faits, district, commune, quartier,
                situation, resume, author_id, degats, mesures_prises, created_at
         FROM reports ${whereSql}
         ORDER BY date_faits DESC
         LIMIT ? OFFSET ?`,
        ...params,
        pageSize,
        offset,
      );

      // Mapper les auteurs
      const authorIds = [
        ...new Set(items.map((i) => i.author_id).filter(Boolean)),
      ];
      const authors = {};
      if (authorIds.length) {
        const rows = await db.all(
          `SELECT id, display_name FROM users WHERE id IN (${authorIds
            .map(() => "?")
            .join(",")})`,
          ...authorIds,
        );
        rows.forEach((r) => (authors[r.id] = r.display_name));
      }

      const mapped = items.map((i) => ({
        ...i,
        author: authors[i.author_id] || null,
        situation: (() => {
          try {
            return JSON.parse(i.situation || "{}");
          } catch (e) {
            return {};
          }
        })(),
        degats: (() => {
          try {
            return JSON.parse(i.degats || "{}");
          } catch (e) {
            return {};
          }
        })(),
        mesures_prises: (() => {
          try {
            return JSON.parse(i.mesures_prises || "{}");
          } catch (e) {
            return {};
          }
        })(),
      }));

      res.json({
        items: mapped,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        pages: Math.ceil(total / pageSize),
      });
    } catch (err) {
      console.error("Search reports error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== ROUTES GROUPÉES (DOIVENT ÊTRE AVANT /:id) ==========

  // Liste des victimes par district, commune et situation
  router.get("/victims", authMiddleware, async (req, res) => {
    try {
      const { district, commune, type_situation, date_debut, date_fin } =
        req.query;

      let where = ["degats LIKE '%\"humains\"%'"];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (commune) {
        where.push("commune = ?");
        params.push(commune);
      }
      if (type_situation) {
        where.push("situation LIKE ?");
        params.push(`%${type_situation}%`);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const items = await db.all(
        `SELECT id, numero_rapport, date_faits, district, commune, quartier,
                situation, degats, author_id, created_at
         FROM reports ${whereSql}
         ORDER BY district, commune, situation`,
        ...params,
      );

      // Analyser degats et extraire les victimes
      const victims = [];
      items.forEach((report) => {
        try {
          const degats = JSON.parse(report.degats || "{}");
          const situation = JSON.parse(report.situation || "{}");
          const humains = degats.humains || "";
          if (humains) {
            // Supposer que humains est une chaîne avec les détails des victimes
            victims.push({
              report_id: report.id,
              numero_rapport: report.numero_rapport,
              date_faits: report.date_faits,
              district: report.district,
              commune: report.commune,
              quartier: report.quartier,
              type_situation:
                situation.militaire ||
                situation.sociopolitique ||
                situation.autre ||
                "Autre",
              victimes: humains,
            });
          }
        } catch (e) {}
      });

      res.json({ victims });
    } catch (err) {
      console.error("Victims report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Liste des dégâts par district et commune
  router.get("/damages", authMiddleware, async (req, res) => {
    try {
      const { district, commune, date_debut, date_fin } = req.query;

      let where = [
        "(degats LIKE '%\"materiels\"%' OR degats LIKE '%\"financiers\"%')",
      ];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (commune) {
        where.push("commune = ?");
        params.push(commune);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const items = await db.all(
        `SELECT id, numero_rapport, date_faits, district, commune, quartier,
                situation, degats, mesures_prises
         FROM reports ${whereSql}
         ORDER BY district, commune`,
        ...params,
      );

      // Parse degats
      const damages = items
        .map((report) => {
          try {
            const degats = JSON.parse(report.degats || "{}");
            const situation = JSON.parse(report.situation || "{}");
            return {
              report_id: report.id,
              numero_rapport: report.numero_rapport,
              date_faits: report.date_faits,
              district: report.district,
              commune: report.commune,
              quartier: report.quartier,
              type_situation:
                situation.militaire ||
                situation.sociopolitique ||
                situation.autre ||
                "Autre",
              degats_materiels: degats.materiels || "",
              degats_financiers: degats.financiers || "",
              mesures_prises: JSON.parse(report.mesures_prises || "{}"),
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      res.json({ damages });
    } catch (err) {
      console.error("Damages report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Rapport global par district
  router.get("/global", authMiddleware, async (req, res) => {
    try {
      const { district, date_debut, date_fin } = req.query;

      let where = [];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

      // Aggregate by district
      const aggregates = await db.all(
        `SELECT district,
                COUNT(*) as total_reports,
                SUM(CASE WHEN degats LIKE '%materiels%' THEN 1 ELSE 0 END) as reports_with_material_damage,
                SUM(CASE WHEN degats LIKE '%financiers%' THEN 1 ELSE 0 END) as reports_with_financial_damage,
                SUM(CASE WHEN degats LIKE '%humains%' THEN 1 ELSE 0 END) as reports_with_human_damage,
                SUM(CASE WHEN situation LIKE '%militaire%' THEN 1 ELSE 0 END) as reports_with_military_situation,
                SUM(CASE WHEN situation LIKE '%sociopolitique%' THEN 1 ELSE 0 END) as reports_with_sociopolitical_situation,
                SUM(CASE WHEN situation LIKE '%autre%' THEN 1 ELSE 0 END) as reports_with_other_situation
         FROM reports ${whereSql}
         GROUP BY district
         ORDER BY district`,
        ...params,
      );

      res.json({ aggregates });
    } catch (err) {
      console.error("Global report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== EXPORTS PDF MULTI-PAGES ==========

  // Export PDF rapports victimes
  router.post("/victims/pdf", authMiddleware, async (req, res) => {
    try {
      const { district, commune, type_situation, date_debut, date_fin } =
        req.body;

      let where = ["degats LIKE '%\"humains\"%'"];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (commune) {
        where.push("commune = ?");
        params.push(commune);
      }
      if (type_situation) {
        where.push("situation LIKE ?");
        params.push(`%${type_situation}%`);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const items = await db.all(
        `SELECT id, numero_rapport, date_faits, district, commune, quartier,
                situation, degats, author_id, created_at
         FROM reports ${whereSql}
         ORDER BY district, commune`,
        ...params,
      );

      const PDFDocument = require("pdfkit");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="victimes-${new Date().toISOString().split("T")[0]}.pdf"`,
      );

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("RAPPORT : LISTE DES VICTIMES", { align: "center" });
      doc.moveDown();

      if (items.length === 0) {
        doc.fontSize(12).text("Aucune victime trouvée.");
        doc.end();
        return;
      }

      items.forEach((report, idx) => {
        if (idx > 0) doc.addPage();

        const degats = JSON.parse(report.degats || "{}");
        const humains = degats.humains || "-";

        doc.fontSize(11).text(`Rapport #${report.numero_rapport}`, {
          underline: true,
        });
        doc.fontSize(10);
        doc.text(`Date : ${report.date_faits}`);
        doc.text(`District : ${report.district}`);
        doc.text(`Commune : ${report.commune}`);
        doc.text(`Quartier : ${report.quartier || "-"}`);
        doc.moveDown(0.3);
        doc.text(`Victimes :`, { underline: true });
        doc.text(humains);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (err) {
      console.error("Victims PDF export error:", err);
      if (!res.headersSent)
        res.status(500).json({ error: "Erreur export PDF" });
    }
  });

  // Export PDF rapports dégâts
  router.post("/damages/pdf", authMiddleware, async (req, res) => {
    try {
      const { district, commune, date_debut, date_fin } = req.body;

      let where = [
        "(degats LIKE '%\"materiels\"%' OR degats LIKE '%\"financiers\"%')",
      ];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (commune) {
        where.push("commune = ?");
        params.push(commune);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
      const items = await db.all(
        `SELECT id, numero_rapport, date_faits, district, commune, quartier,
                situation, degats, mesures_prises
         FROM reports ${whereSql}
         ORDER BY district, commune`,
        ...params,
      );

      const PDFDocument = require("pdfkit");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="degats-${new Date().toISOString().split("T")[0]}.pdf"`,
      );

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("RAPPORT : LISTE DES DÉGÂTS", { align: "center" });
      doc.moveDown();

      if (items.length === 0) {
        doc.fontSize(12).text("Aucun dégât trouvé.");
        doc.end();
        return;
      }

      items.forEach((report, idx) => {
        if (idx > 0) doc.addPage();

        const degats = JSON.parse(report.degats || "{}");
        const materiels = degats.materiels || "-";
        const financiers = degats.financiers || "-";

        doc.fontSize(11).text(`Rapport #${report.numero_rapport}`, {
          underline: true,
        });
        doc.fontSize(10);
        doc.text(`Date : ${report.date_faits}`);
        doc.text(`District : ${report.district}`);
        doc.text(`Commune : ${report.commune}`);
        doc.text(`Quartier : ${report.quartier || "-"}`);
        doc.moveDown(0.3);
        doc.text(`Dégâts Matériels :`, { underline: true });
        doc.text(materiels);
        doc.moveDown(0.2);
        doc.text(`Dégâts Financiers :`, { underline: true });
        doc.text(financiers);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (err) {
      console.error("Damages PDF export error:", err);
      if (!res.headersSent)
        res.status(500).json({ error: "Erreur export PDF" });
    }
  });

  // Export PDF rapport global
  router.post("/global/pdf", authMiddleware, async (req, res) => {
    try {
      const { district, date_debut, date_fin } = req.body;

      let where = [];
      let params = [];

      if (district) {
        where.push("district = ?");
        params.push(district);
      }
      if (date_debut) {
        where.push("date_faits >= ?");
        params.push(date_debut);
      }
      if (date_fin) {
        where.push("date_faits <= ?");
        params.push(date_fin);
      }

      const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

      const aggregates = await db.all(
        `SELECT district,
                COUNT(*) as total_reports,
                SUM(CASE WHEN degats LIKE '%materiels%' THEN 1 ELSE 0 END) as reports_with_material_damage,
                SUM(CASE WHEN degats LIKE '%financiers%' THEN 1 ELSE 0 END) as reports_with_financial_damage,
                SUM(CASE WHEN degats LIKE '%humains%' THEN 1 ELSE 0 END) as reports_with_human_damage,
                SUM(CASE WHEN situation LIKE '%militaire%' THEN 1 ELSE 0 END) as reports_with_military_situation,
                SUM(CASE WHEN situation LIKE '%sociopolitique%' THEN 1 ELSE 0 END) as reports_with_sociopolitical_situation,
                SUM(CASE WHEN situation LIKE '%autre%' THEN 1 ELSE 0 END) as reports_with_other_situation
         FROM reports ${whereSql}
         GROUP BY district
         ORDER BY district`,
        ...params,
      );

      const PDFDocument = require("pdfkit");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="rapport-global-${new Date().toISOString().split("T")[0]}.pdf"`,
      );

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        layout: "landscape",
      });
      doc.pipe(res);

      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("RAPPORT GLOBAL", { align: "center" });
      doc.moveDown(0.5);

      if (aggregates.length === 0) {
        doc.fontSize(12).text("Aucune donnée trouvée.");
        doc.end();
        return;
      }

      // Table
      doc.fontSize(10);
      const colWidths = {
        district: 80,
        total: 50,
        material: 50,
        financial: 50,
        human: 50,
        military: 50,
        sociopolitical: 60,
        other: 50,
      };

      const startX = 40;
      const startY = doc.y + 20;
      let y = startY;

      // Headers
      doc.text("District", startX, y, { width: colWidths.district });
      doc.text("Total", startX + colWidths.district, y, {
        width: colWidths.total,
      });
      doc.text(
        "Dégâts Mat.",
        startX + colWidths.district + colWidths.total,
        y,
        {
          width: colWidths.material,
        },
      );
      doc.text(
        "Dégâts Fin.",
        startX + colWidths.district + colWidths.total + colWidths.material,
        y,
        { width: colWidths.financial },
      );
      doc.text(
        "Dégâts Hum.",
        startX +
          colWidths.district +
          colWidths.total +
          colWidths.material +
          colWidths.financial,
        y,
        { width: colWidths.human },
      );
      doc.text(
        "Mil.",
        startX +
          colWidths.district +
          colWidths.total +
          colWidths.material +
          colWidths.financial +
          colWidths.human,
        y,
        { width: colWidths.military },
      );
      doc.text(
        "Socio-pol.",
        startX +
          colWidths.district +
          colWidths.total +
          colWidths.material +
          colWidths.financial +
          colWidths.human +
          colWidths.military,
        y,
        { width: colWidths.sociopolitical },
      );
      doc.text(
        "Autre",
        startX +
          colWidths.district +
          colWidths.total +
          colWidths.material +
          colWidths.financial +
          colWidths.human +
          colWidths.military +
          colWidths.sociopolitical,
        y,
        { width: colWidths.other },
      );

      y += 20;

      // Rows
      aggregates.forEach((a) => {
        doc.text(a.district, startX, y, { width: colWidths.district });
        doc.text(String(a.total_reports), startX + colWidths.district, y, {
          width: colWidths.total,
        });
        doc.text(
          String(a.reports_with_material_damage),
          startX + colWidths.district + colWidths.total,
          y,
          { width: colWidths.material },
        );
        doc.text(
          String(a.reports_with_financial_damage),
          startX + colWidths.district + colWidths.total + colWidths.material,
          y,
          { width: colWidths.financial },
        );
        doc.text(
          String(a.reports_with_human_damage),
          startX +
            colWidths.district +
            colWidths.total +
            colWidths.material +
            colWidths.financial,
          y,
          { width: colWidths.human },
        );
        doc.text(
          String(a.reports_with_military_situation),
          startX +
            colWidths.district +
            colWidths.total +
            colWidths.material +
            colWidths.financial +
            colWidths.human,
          y,
          { width: colWidths.military },
        );
        doc.text(
          String(a.reports_with_sociopolitical_situation),
          startX +
            colWidths.district +
            colWidths.total +
            colWidths.material +
            colWidths.financial +
            colWidths.human +
            colWidths.military,
          y,
          { width: colWidths.sociopolitical },
        );
        doc.text(
          String(a.reports_with_other_situation),
          startX +
            colWidths.district +
            colWidths.total +
            colWidths.material +
            colWidths.financial +
            colWidths.human +
            colWidths.military +
            colWidths.sociopolitical,
          y,
          { width: colWidths.other },
        );
        y += 20;
      });

      doc.end();
    } catch (err) {
      console.error("Global PDF export error:", err);
      if (!res.headersSent)
        res.status(500).json({ error: "Erreur export PDF" });
    }
  });

  // ========== FIN ROUTES GROUPÉES ==========

  // Obtenir le détail
  router.get("/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const row = await db.get("SELECT * FROM reports WHERE id = ?", id);
      if (!row) return res.status(404).json({ error: "Not found" });

      const author = row.author_id
        ? await db.get(
            "SELECT id, display_name FROM users WHERE id = ?",
            row.author_id,
          )
        : null;

      // Audit
      const auditId = uuidv4();
      await db.run(
        "INSERT INTO audit_logs(id, user_id, report_id, action, action_data, ip_address, created_at) VALUES (?,?,?,?,?,?,?)",
        auditId,
        req.user.id,
        id,
        "CONSULTATION_DETAIL",
        JSON.stringify({}),
        req.ip,
        new Date().toISOString(),
      );

      // Analyser les champs JSON en toute sécurité
      try {
        row.situation = JSON.parse(row.situation || "{}");
      } catch (e) {
        row.situation = {};
      }
      try {
        row.degats = JSON.parse(row.degats || "{}");
      } catch (e) {
        row.degats = {};
      }
      try {
        row.mesures_prises = JSON.parse(row.mesures_prises || "{}");
      } catch (e) {
        row.mesures_prises = {};
      }
      row.author = author;

      res.json(row);
    } catch (err) {
      console.error("Get report detail error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mettre à jour le rapport
  router.put("/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;

      // Vérifier si le rapport existe et si l'utilisateur est l'auteur ou admin
      const existing = await db.get(
        "SELECT author_id FROM reports WHERE id = ?",
        id,
      );
      if (!existing) return res.status(404).json({ error: "Report not found" });
      if (existing.author_id !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });

      // Validation
      if (
        !body.numero_rapport ||
        !body.district ||
        !body.commune ||
        !body.date_faits
      ) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }

      // Vérifier qu'au moins une situation est remplie
      const situationData = body.situation || {};
      if (
        Object.keys(situationData).length === 0 ||
        !Object.values(situationData).some((v) => v && v.trim() !== "")
      ) {
        return res
          .status(400)
          .json({ error: "Au moins une situation doit être remplie" });
      }

      await db.run(
        `UPDATE reports SET
           numero_rapport = ?, district = ?, commune = ?, quartier = ?, date_faits = ?,
           situation = ?, resume = ?, contenu = ?, degats = ?, mesures_prises = ?
         WHERE id = ?`,
        body.numero_rapport,
        body.district,
        body.commune,
        body.quartier || null,
        body.date_faits,
        JSON.stringify(body.situation || {}),
        body.resume || null,
        body.contenu || null,
        JSON.stringify(body.degats || {}),
        JSON.stringify(body.mesures_prises || {}),
        id,
      );

      // Journal d'audit
      const auditId = uuidv4();
      await db.run(
        "INSERT INTO audit_logs(id, user_id, report_id, action, action_data, ip_address, created_at) VALUES (?,?,?,?,?,?,?)",
        auditId,
        req.user.id,
        id,
        "UPDATE_REPORT",
        JSON.stringify({ summary: body.resume || "" }),
        req.ip,
        new Date().toISOString(),
      );

      res.json({ id });
    } catch (err) {
      console.error("Update report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Supprimer le rapport
  router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;

      // Vérifier si le rapport existe et si l'utilisateur est l'auteur ou admin
      const existing = await db.get(
        "SELECT author_id FROM reports WHERE id = ?",
        id,
      );
      if (!existing) return res.status(404).json({ error: "Report not found" });
      if (existing.author_id !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });

      await db.run("DELETE FROM reports WHERE id = ?", id);

      // Journal d'audit
      const auditId = uuidv4();
      await db.run(
        "INSERT INTO audit_logs(id, user_id, report_id, action, action_data, ip_address, created_at) VALUES (?,?,?,?,?,?,?)",
        auditId,
        req.user.id,
        id,
        "DELETE_REPORT",
        JSON.stringify({}),
        req.ip,
        new Date().toISOString(),
      );

      res.json({ message: "Report deleted" });
    } catch (err) {
      console.error("Delete report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Rapport individuel (par victime) - assuming victims are in degats.humains
  router.get("/individual/:id", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const report = await db.get("SELECT * FROM reports WHERE id = ?", id);
      if (!report) return res.status(404).json({ error: "Not found" });

      const author = report.author_id
        ? await db.get(
            "SELECT display_name FROM users WHERE id = ?",
            report.author_id,
          )
        : null;

      // Parse degats
      try {
        report.degats = JSON.parse(report.degats || "{}");
      } catch (e) {
        report.degats = {};
      }
      try {
        report.mesures_prises = JSON.parse(report.mesures_prises || "{}");
      } catch (e) {
        report.mesures_prises = {};
      }
      report.author = author;

      res.json(report);
    } catch (err) {
      console.error("Individual report error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- PDF génération (détail + filigrane) ---
  const PDFDocument = require("pdfkit");
  const fs = require("fs");
  const path = require("path");

  router.get("/:id/pdf", authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const report = await db.get("SELECT * FROM reports WHERE id = ?", id);

      if (!report) {
        return res.status(404).json({ error: "Rapport introuvable" });
      }

      // Parse JSON safely
      let situation = {};
      let degats = {};
      let mesures = {};
      try {
        situation =
          typeof report.situation === "string"
            ? JSON.parse(report.situation || "{}")
            : report.situation || {};
      } catch (e) {
        situation = {};
      }
      try {
        degats =
          typeof report.degats === "string"
            ? JSON.parse(report.degats || "{}")
            : report.degats || {};
      } catch (e) {
        degats = {};
      }
      try {
        mesures =
          typeof report.mesures_prises === "string"
            ? JSON.parse(report.mesures_prises || "{}")
            : report.mesures_prises || {};
      } catch (e) {
        mesures = {};
      }

      // Find author display name if present
      let authorName = null;
      if (report.author_id) {
        const a = await db.get(
          "SELECT display_name FROM users WHERE id = ?",
          report.author_id,
        );
        authorName = a ? a.display_name : null;
      }

      // Prepare response headers for a streamed PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=rapport_${report.numero_rapport || id}.pdf`,
      );

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      doc.pipe(res);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const contentWidth =
        pageWidth - doc.page.margins.left - doc.page.margins.right;

      // Filigrane (logo centré) si présent
      const logoPath = path.resolve(
        __dirname,
        "..",
        "..",
        "assets",
        "ig-pnc-logo.png",
      );
      if (fs.existsSync(logoPath)) {
        try {
          const wmSize = Math.min(pageWidth, pageHeight) * 0.6;
          const x = (pageWidth - wmSize) / 2;
          const y = (pageHeight - wmSize) / 2;
          doc.save();
          // opacity may not be supported in very old pdfkit versions, but try/catch shields it
          try {
            doc.opacity(0.06);
          } catch (e) {
            // ignore if opacity not supported
          }
          doc.image(logoPath, x, y, { width: wmSize, height: wmSize });
          try {
            doc.opacity(1);
          } catch (e) {}
          doc.restore();
        } catch (e) {
          console.warn(
            "Filigrane non appliqué :",
            e && e.message ? e.message : e,
          );
        }
      }

      // Header
      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#0A3D62")
        .text("RAPPORT D'INCIDENT", { align: "center" });
      doc.moveDown(0.5);

      // 1. Informations générales
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#000")
        .text("1. Informations générales");
      doc.moveDown(0.25);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Numéro : ", { continued: true });
      doc.font("Helvetica").text(report.numero_rapport || "-");
      doc.font("Helvetica-Bold").text("Date des faits : ", { continued: true });
      doc.font("Helvetica").text(report.date_faits || "-");
      if (authorName) {
        doc.font("Helvetica-Bold").text("Auteur : ", { continued: true });
        doc.font("Helvetica").text(authorName);
      }

      // 2. Localisation
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(12).text("2. Localisation");
      doc.moveDown(0.25);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("District : ", { continued: true });
      doc.font("Helvetica").text(report.district || "-");
      doc.font("Helvetica-Bold").text("Commune : ", { continued: true });
      doc.font("Helvetica").text(report.commune || "-");
      doc.font("Helvetica-Bold").text("Quartier : ", { continued: true });
      doc.font("Helvetica").text(report.quartier || "-");

      // 3. Situation
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(12).text("3. Situation sécuritaire");
      doc.moveDown(0.25);
      const sitMilitaire = situation.militaire || "-";
      const sitSociopolitique = situation.sociopolitique || "-";
      const sitAutre = situation.autre || "-";
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Militaire et policière : ", { continued: true });
      doc.font("Helvetica").text(sitMilitaire);
      doc.moveDown(0.2);
      doc
        .font("Helvetica-Bold")
        .text("Socio-politique : ", { continued: true });
      doc.font("Helvetica").text(sitSociopolitique);
      doc.moveDown(0.2);
      doc.font("Helvetica-Bold").text("Autre : ", { continued: true });
      doc.font("Helvetica").text(sitAutre);
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").text("Détails :");
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(report.details_situation || report.details || "-", {
          width: contentWidth,
          align: "left",
          lineGap: 4,
        });

      // 4. Dégâts
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(12).text("4. Dégâts");
      doc.moveDown(0.25);
      const degatsMateriels =
        degats.materiels || degats.materiel || degats.degats_materiels || "-";
      const degatsFinanciers =
        degats.financiers ||
        degats.financier ||
        degats.degats_financiers ||
        "-";
      const degatsHumains =
        degats.humains || degats.degats_humains || degats.humain || "-";
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Matériels : ", { continued: true });
      doc.font("Helvetica").text(degatsMateriels);
      doc.font("Helvetica-Bold").text("Financiers : ", { continued: true });
      doc.font("Helvetica").text(degatsFinanciers);
      doc.font("Helvetica-Bold").text("Humains : ", { continued: true });
      doc.font("Helvetica").text(degatsHumains);

      // 5. Mesures prises
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(12).text("5. Mesures prises");
      doc.moveDown(0.25);
      const mesuresCg =
        mesures.cg ||
        mesures.commissariat ||
        mesures.mesureCG ||
        mesures.commissariat ||
        "-";
      const mesuresIg =
        mesures.ig ||
        mesures.inspection ||
        mesures.ig ||
        mesures.mesureIG ||
        "-";
      doc.font("Helvetica-Bold").text("Commissariat Général :");
      doc.font("Helvetica").text(mesuresCg || "-");
      doc.moveDown(0.2);
      doc.font("Helvetica-Bold").text("Inspection Générale :");
      doc.font("Helvetica").text(mesuresIg || "-");

      // Contenu libre si existant
      if (report.contenu) {
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(12).text("6. Contenu");
        doc.moveDown(0.25);
        doc.font("Helvetica").fontSize(10).text(report.contenu, {
          width: contentWidth,
          align: "left",
          lineGap: 4,
        });
      }

      // Footer / meta
      doc.moveDown(1);
      doc.fontSize(9).fillColor("gray");
      doc.text(`Créé le : ${report.created_at || "—"}`, { align: "left" });
      if (authorName) doc.text(`Rédigé par : ${authorName}`, { align: "left" });

      doc.end();
    } catch (err) {
      // Log serveur pour debug (inspecte la console node)
      console.error(
        "Erreur génération PDF :",
        err && (err.stack || err.message || err),
      );
      // Si le stream n'a pas encore été démarré, renvoyer JSON ; sinon on ne peut plus.
      try {
        if (!res.headersSent) {
          return res.status(500).json({ error: "Erreur export PDF" });
        } else {
          // headers already sent; close connection
          res.end();
        }
      } catch (e) {
        // nothing else to do
        res.end();
      }
    }
  });

  return router;
};
