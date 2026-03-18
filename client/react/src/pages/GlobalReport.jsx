import React, { useState } from "react";
import { Form, Button, Row, Col, Spinner, Table } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = "http://localhost:3001";

export default function GlobalReport() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aggregates, setAggregates] = useState([]);
  const [filters, setFilters] = useState({
    district: "",
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
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;

      const response = await axios.get(`${API}/reports/global`, {
        params,
        headers: { Authorization: "Bearer " + token },
      });
      setAggregates(response.data.aggregates || []);
    } catch (err) {
      console.error(err);
      setAggregates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      const params = {};
      if (filters.district) params.district = filters.district;
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;

      const response = await axios.post(`${API}/reports/global/pdf`, params, {
        headers: { Authorization: "Bearer " + token },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `rapport-global-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Erreur export PDF:", err);
      alert("Erreur lors du téléchargement du PDF");
    }
  }

  return (
    <Layout title="Rapport global">
      <div className="container mt-4">
        <h2 className="text-primary mb-3">Rapport global par district</h2>
        <hr />

        <form
          onSubmit={handleSearch}
          className="p-3 border rounded bg-light mb-4"
        >
          <Row className="mb-3">
            <Col md={4}>
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
            <Col md={4}>
              <label className="form-label">Date début</label>
              <input
                type="date"
                className="form-control"
                name="date_debut"
                value={filters.date_debut}
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
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
              disabled={aggregates.length === 0 || loading}
              onClick={() => handleExportPDF()}
            >
              Télécharger PDF
            </Button>
          </div>
        </form>

        <div>
          <h4>Résultats</h4>
          <hr />
          {aggregates.length === 0 ? (
            <p>Aucune donnée trouvée.</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>District</th>
                  <th>Total Rapports</th>
                  <th>Rapports avec Dégâts Matériels</th>
                  <th>Rapports avec Dégâts Financiers</th>
                  <th>Rapports avec Dégâts Humains</th>
                  <th>Rapports Situation Militaire</th>
                  <th>Rapports Situation Socio-politique</th>
                  <th>Rapports Situation Autre</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.district}</td>
                    <td>{a.total_reports}</td>
                    <td>{a.reports_with_material_damage}</td>
                    <td>{a.reports_with_financial_damage}</td>
                    <td>{a.reports_with_human_damage}</td>
                    <td>{a.reports_with_military_situation}</td>
                    <td>{a.reports_with_sociopolitical_situation}</td>
                    <td>{a.reports_with_other_situation}</td>
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
