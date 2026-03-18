import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getReport, updateReport } from "../api/api";

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  // --- STATE DU FORMULAIRE ---
  const [numero, setNumero] = useState("");
  const [dateFaits, setDateFaits] = useState("");
  const [district, setDistrict] = useState("");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [situation, setSituation] = useState({
    militaire: "",
    sociopolitique: "",
    autre: "",
  });
  const [degatsMat, setDegatsMat] = useState("");
  const [degatsFin, setDegatsFin] = useState("");
  const [degatsHum, setDegatsHum] = useState("");
  const [mesureCG, setMesureCG] = useState("");
  const [mesureIG, setMesureIG] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // --- OPTIONS DISTRICT + COMMUNES ---
  const DISTRICTS = ["Lukunga", "Funa", "Mont-Amba", "Tshangu"];

  const COMMUNES_BY_DISTRICT = {
    Lukunga: [
      "Gombe",
      "Ngaliema",
      "Kintambo",
      "Bandalungwa",
      "Selembao",
      "Mont-Ngafula",
    ],
    Funa: ["Kalamu", "Kasa-Vubu", "Makala", "Ngiri-Ngiri", "Bumbu"],
    "Mont-Amba": ["Lemba", "Limete", "Matete", "Kisenso", "Ngaba"],
    Tshangu: ["Masina", "Kimbanseke", "N’djili", "Nsele", "Maluku"],
  };

  const communesDisponibles = district ? COMMUNES_BY_DISTRICT[district] : [];

  // --- VALIDATION ---
  const isFormValid =
    numero &&
    dateFaits &&
    district &&
    commune &&
    Object.values(situation).some((v) => v && v.trim() !== "");

  // Récupérer les données du rapport
  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await getReport(id, token);
        const report = response.data;
        setNumero(report.numero_rapport || "");
        setDateFaits(report.date_faits || "");
        setDistrict(report.district || "");
        setCommune(report.commune || "");
        setQuartier(report.quartier || "");
        setSituation(
          report.situation || {
            militaire: "",
            sociopolitique: "",
            autre: "",
          },
        );
        setDegatsMat(report.degats?.materiels || "");
        setDegatsFin(report.degats?.financiers || "");
        setDegatsHum(report.degats?.humains || "");
        setMesureCG(report.mesures_prises?.cg || "");
        setMesureIG(report.mesures_prises?.ig || "");
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement du rapport.");
      } finally {
        setFetchLoading(false);
      }
    }
    if (token) fetchReport();
  }, [id, token]);

  // --- SUBMIT ---
  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await updateReport(
        id,
        {
          numero_rapport: numero,
          date_faits: dateFaits,
          district: district,
          commune: commune,
          quartier: quartier || "",
          situation: situation,
          resume: "",
          contenu: "",
          degats: {
            materiels: degatsMat,
            financiers: degatsFin,
            humains: degatsHum,
          },
          mesures_prises: {
            cg: mesureCG,
            ig: mesureIG,
          },
        },
        token,
      );
      setSuccess("Le rapport a été modifié avec succès !");
      setTimeout(() => navigate("/search"), 2000);
    } catch (err) {
      console.error(err);
      setError("Une erreur s'est produite lors de la modification.");
    }
    setLoading(false);
  }

  if (fetchLoading)
    return (
      <Layout title="Modifier Rapport">
        <Spinner animation="border" />
      </Layout>
    );

  return (
    <Layout title="Modifier Rapport">
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        {/* ---------------------- SECTION 1 ---------------------- */}
        <h4 className="text-primary mt-4">1. Informations générales</h4>
        <hr />

        <Row className="align-items-end">
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Numéro du rapport *</Form.Label>
              <Form.Control
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value.slice(0, 50))}
                maxLength={50}
                required
                size="sm"
              />
              <small className="text-muted">{numero.length}/50</small>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Date des faits *</Form.Label>
              <Form.Control
                type="date"
                value={dateFaits}
                onChange={(e) => setDateFaits(e.target.value)}
                required
                size="sm"
              />
            </Form.Group>
          </Col>
        </Row>

        {/* ---------------------- SECTION 2 ---------------------- */}
        <h4 className="text-primary mt-4">2. Localisation</h4>
        <hr />

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>District *</Form.Label>
              <Form.Select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setCommune(""); // reset la commune
                }}
              >
                <option value="">Sélectionnez...</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Commune *</Form.Label>
              <Form.Select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                disabled={!district}
              >
                <option value="">Sélectionnez...</option>
                {communesDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Quartier</Form.Label>
              <Form.Control
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* ---------------------- SECTION 3 ---------------------- */}
        <h4 className="text-primary mt-4">3. Situation sécuritaire</h4>
        <hr />

        <Form.Group className="mb-3">
          <Form.Label>Situation militaire et policière</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={situation.militaire}
            onChange={(e) => {
              const val = e.target.value.slice(0, 2000);
              setSituation({ ...situation, militaire: val });
            }}
            maxLength={2000}
          />
          <small className="text-muted">{situation.militaire.length}/2000</small>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Situation socio-politique</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={situation.sociopolitique}
            onChange={(e) => {
              const val = e.target.value.slice(0, 2000);
              setSituation({ ...situation, sociopolitique: val });
            }}
            maxLength={2000}
          />
          <small className="text-muted">{situation.sociopolitique.length}/2000</small>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Autre situation</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={situation.autre}
            onChange={(e) => {
              const val = e.target.value.slice(0, 2000);
              setSituation({ ...situation, autre: val });
            }}
            maxLength={2000}
          />
          <small className="text-muted">{situation.autre.length}/2000</small>
        </Form.Group>

        {/* ---------------------- SECTION 4 ---------------------- */}
        <h4 className="text-primary mt-4">4. Dégâts</h4>
        <hr />

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Dégâts matériels</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={degatsMat}
                onChange={(e) => setDegatsMat(e.target.value.slice(0, 1500))}
                maxLength={1500}
              />
              <small className="text-muted">{degatsMat.length}/1500</small>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Dégâts financiers</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={degatsFin}
                onChange={(e) => setDegatsFin(e.target.value.slice(0, 1500))}
                maxLength={1500}
              />
              <small className="text-muted">{degatsFin.length}/1500</small>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Dégâts humains</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={degatsHum}
                onChange={(e) => setDegatsHum(e.target.value.slice(0, 1500))}
                maxLength={1500}
              />
              <small className="text-muted">{degatsHum.length}/1500</small>
            </Form.Group>
          </Col>
        </Row>

        {/* ---------------------- SECTION 5 ---------------------- */}
        <h4 className="text-primary mt-4">5. Mesures prises</h4>
        <hr />

        <Form.Group className="mb-3">
          <Form.Label>Mesures du Commissariat Général</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={mesureCG}
            onChange={(e) => setMesureCG(e.target.value.slice(0, 1500))}
            maxLength={1500}
          />
          <small className="text-muted">{mesureCG.length}/1500</small>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Mesures de l'Inspection Générale</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={mesureIG}
            onChange={(e) => setMesureIG(e.target.value.slice(0, 1500))}
            maxLength={1500}
          />
          <small className="text-muted">{mesureIG.length}/1500</small>
        </Form.Group>

        <Button
          type="submit"
          variant="primary"
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            "Modifier le rapport"
          )}
        </Button>
      </Form>
    </Layout>
  );
}
