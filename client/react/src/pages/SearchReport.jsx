// src/pages/SearchReport.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { searchReports, deleteReport } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { Spinner, Modal, Button } from "react-bootstrap";

export default function SearchReports() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filters, setFilters] = useState({
    numero: "",
    date_faits: "",
    district: "",
    commune: "",
    quartier: "",
    type_situation: "",
    type_degats: "",
  });

  function handleChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  function handleDelete(id) {
    setDeleteId(id);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteReport(deleteId, token);
      setReports(reports.filter((r) => r.id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);

    if (!token) {
      alert("Vous devez être connecté pour effectuer une recherche.");
      setLoading(false);
      return;
    }

    // Si tous les filtres sont vides, effacer les résultats et arrêter
    if (!Object.values(filters).some((f) => f && f.toString().trim() !== "")) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      // Mapper les noms de filtres locaux aux noms de paramètres du backend
      const params = {};
      if (filters.numero) params.numero_rapport = filters.numero;
      if (filters.date_faits) {
        // Le backend prend en charge la date exacte via `date_faits` ou la plage via date_debut/date_fin.
        params.date_faits = filters.date_faits;
      }
      if (filters.district) params.district = filters.district;
      if (filters.commune) params.commune = filters.commune;
      if (filters.quartier) params.quartier = filters.quartier;
      if (filters.type_situation)
        params.type_situation = filters.type_situation;
      if (filters.type_degats) params.type_degats = filters.type_degats;

      const response = await searchReports(params, token);
      console.log("Réponse brute :", response.data);
      setReports(response.data.items || []);
    } catch (err) {
      console.error("Erreur recherche :", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  if (!token)
    return (
      <Layout title="Recherche avancée des rapports">
        <div className="container mt-4">
          <p className="text-danger">
            Veuillez vous connecter pour accéder aux rapports.
          </p>
        </div>
      </Layout>
    );

  return (
    <Layout title="Recherche avancée des rapports">
      <div className="container mt-4">
        <h2 className="text-primary mb-3">Recherche avancée des rapports</h2>
        <hr />

        <form onSubmit={handleSearch} className="p-3 border rounded bg-light">
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Numéro du rapport</label>
              <input
                type="text"
                className="form-control"
                name="numero"
                value={filters.numero}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Date des faits</label>
              <input
                type="date"
                className="form-control"
                name="date_faits"
                value={filters.date_faits}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">District</label>
              <select
                className="form-select"
                name="district"
                value={filters.district}
                onChange={handleChange}
              >
                <option value="">-- Sélectionner --</option>
                <option>Funa</option>
                <option>Lukunga</option>
                <option>Mont-Amba</option>
                <option>Tshangu</option>
                <option>Plateau</option>
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Commune</label>
              <input
                type="text"
                className="form-control"
                name="commune"
                value={filters.commune}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Quartier</label>
              <input
                type="text"
                className="form-control"
                name="quartier"
                value={filters.quartier}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Situation sécuritaire</label>
              <input
                type="text"
                className="form-control"
                name="type_situation"
                value={filters.type_situation}
                onChange={handleChange}
                placeholder="Rechercher dans les situations"
              />
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-md-4">
              <label className="form-label">Type de dégâts</label>
              <input
                type="text"
                className="form-control"
                name="type_degats"
                value={filters.type_degats}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary px-4"
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Rechercher"}
          </button>
        </form>

        <div className="mt-4">
          <h4 className="text-secondary">Résultats</h4>
          <hr />

          {!reports || reports.length === 0 ? (
            <p>Aucun rapport trouvé.</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead className="table-dark">
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>District</th>
                  <th>Commune</th>
                  <th>Situation sécuritaire</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.numero_rapport}</td>
                    <td>{r.date_faits}</td>
                    <td>{r.district}</td>
                    <td>{r.commune}</td>
                    <td>
                      {r.situation
                        ? `${r.situation.militaire || ""} ${
                            r.situation.sociopolitique || ""
                          } ${r.situation.autre || ""}`.trim() || "-"
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => navigate(`/reports/${r.id}`)}
                      >
                        Voir plus
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning me-2"
                        onClick={() => navigate(`/reports/${r.id}/edit`)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(r.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est
          irréversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : "Supprimer"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
}
