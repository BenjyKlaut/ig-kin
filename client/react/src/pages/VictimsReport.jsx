import React, { useState } from "react";
import { Form, Button, Row, Col, Spinner, Table } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = "http://localhost:3001";

export default function VictimsReport() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [victims, setVictims] = useState([]);
  const [filters, setFilters] = useState({
    district: "",
    commune: "",
    type_situation: "",
    date_debut: "",
    date_fin: "",
  });

  function handleChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const params = {};
      if (filters.district) params.district = filters.district;
      if (filters.commune) params.commune = filters.commune;
      if (filters.type_situation)
        params.type_situation = filters.type_situation;
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;

      const response = await axios.get(`${API}/reports/victims`, {
        params,
        headers: { Authorization: "Bearer " + token },
      });
      setVictims(response.data.victims || []);
    } catch (err) {
      console.error(err);
      setVictims([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      const params = {};
      if (filters.district) params.district = filters.district;
      if (filters.commune) params.commune = filters.commune;
      if (filters.type_situation) params.type_situation = filters.type_situation;
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;

      const response = await axios.post(`${API}/reports/victims/pdf`, params, {
        headers: { Authorization: "Bearer " + token },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `victimes-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Erreur export PDF:", err);
      alert("Erreur lors du téléchargement du PDF");
    }
  }

  return (
    <Layout title="Liste des victimes">
      <div className="container mt-4">
        <h2 className="text-primary mb-3">
          Liste des victimes par district, commune et situation
        </h2>
        <hr />

        <form
          onSubmit={handleSearch}
          className="p-3 border rounded bg-light mb-4"
        >
          <Row className="mb-3">
            <Col md={3}>
              <label className="form-label">District</label>
              <select
                className="form-select"
                name="district"
                value={filters.district}
                onChange={handleChange}
              >
                <option value="">Tous</option>
                <option>Lukunga</option>
                <option>Funa</option>
                <option>Mont-Amba</option>
                <option>Tshangu</option>
              </select>
            </Col>
            <Col md={3}>
              <label className="form-label">Commune</label>
              <input
                type="text"
                className="form-control"
                name="commune"
                value={filters.commune}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <label className="form-label">Situation sécuritaire</label>
              <input
                type="text"
                className="form-control"
                name="type_situation"
                value={filters.type_situation}
                onChange={handleChange}
                placeholder="Rechercher dans les situations"
              />
            </Col>
            <Col md={3}>
              <label className="form-label">Date début</label>
              <input
                type="date"
                className="form-control"
                name="date_debut"
                value={filters.date_debut}
                onChange={handleChange}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={3}>
              <label className="form-label">Date fin</label>
              <input
                type="date"
                className="form-control"
                name="date_fin"
                value={filters.date_fin}
                onChange={handleChange}
              />
            </Col>
          </Row>
          <div className="d-flex gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Générer le rapport"
              )}
            </Button>
            <Button
              variant="success"
              disabled={victims.length === 0 || loading}
              onClick={() => handleExportPDF()}
            >
              📥 Télécharger PDF
            </Button>
          </div>
        </form>

        <div>
          <h4>Résultats</h4>
          <hr />
          {victims.length === 0 ? (
            <p>Aucune victime trouvée.</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Numéro Rapport</th>
                  <th>Date</th>
                  <th>District</th>
                  <th>Commune</th>
                  <th>Quartier</th>
                  <th>Situation Militaire</th>
                  <th>Situation Socio-politique</th>
                  <th>Situation Autre</th>
                  <th>Détails Situation</th>
                  <th>Victimes</th>
                </tr>
              </thead>
              <tbody>
                {victims.map((v, idx) => (
                  <tr key={idx}>
                    <td>{v.numero_rapport}</td>
                    <td>{v.date_faits}</td>
                    <td>{v.district}</td>
                    <td>{v.commune}</td>
                    <td>{v.quartier}</td>
                    <td>{v.situation?.militaire || "-"}</td>
                    <td>{v.situation?.sociopolitique || "-"}</td>
                    <td>{v.situation?.autre || "-"}</td>
                    <td>{v.details_situation}</td>
                    <td>{v.victimes}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
  );
}
