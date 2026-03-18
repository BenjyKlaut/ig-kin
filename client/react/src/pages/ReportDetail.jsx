// src/pages/ReportDetail.jsx
import React, { useEffect, useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { getReport, downloadPdf } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function ReportDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (id && token) {
      getReport(id, token)
        .then((res) => {
          if (mounted) {
            setData(res.data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Erreur chargement rapport :", err);
          if (mounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [id, token]);

  const handleDownload = async () => {
    if (!token || !id) return;

    setLoadingPdf(true);
    try {
      const response = await downloadPdf(id, token);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const filename =
        data && data.numero_rapport
          ? `rapport_${data.numero_rapport}.pdf`
          : `rapport_${id}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Erreur téléchargement PDF :", err);
    } finally {
      setLoadingPdf(false);
    }
  };

  if (loading)
    return (
      <Layout>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: 200 }}
        >
          <Spinner />
        </div>
      </Layout>
    );

  if (!data)
    return (
      <Layout title="Détail du rapport">
        <p className="text-danger mt-4">Rapport introuvable.</p>
      </Layout>
    );

  // accesseurs sécurisés pour degats et mesures_prises
  const degats = data.degats || {};
  const mesures = data.mesures_prises || {};
  const situation = data.situation || {};

  return (
    <Layout title={`Rapport #${data.numero_rapport || id}`}>
      <div style={{ position: "relative" }}>
        <img
          src="/assets/ig-pnc-logo.png"
          alt="Watermark"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60%",
            height: "60%",
            opacity: 0.05,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <Card
          className="shadow-sm border-0"
          style={{
            borderTop: "4px solid #0A3D62",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Card.Body>
            <h4 style={{ color: "#0A3D62" }}>Détails du rapport</h4>
            <hr />
            <h5 className="text-primary mt-3">1. Informations générales</h5>
            Numéro : <b>{data.numero_rapport || "—"}</b>
            <br />
            Date des faits : <b>{data.date_faits || "—"}</b>
            <h5 className="text-primary mt-4">2. Localisation</h5>
            District : {data.district || "—"}
            <br />
            Commune : {data.commune || "—"}
            <br />
            Quartier : {data.quartier || "—"}
            <h5 className="text-primary mt-4">3. Situation sécuritaire</h5>
            <b>Militaire et policière :</b> {situation.militaire || "—"}
            <br />
            <b>Socio-politique :</b> {situation.sociopolitique || "—"}
            <br />
            <b>Autre :</b> {situation.autre || "—"}
            <br />
            <div className="mt-2">
              <b>Détails :</b>
              <br />
              {data.details_situation || data.details || "—"}
            </div>
            <h5 className="text-primary mt-4">4. Dégâts</h5>
            <b>Matériels :</b>{" "}
            {degats.materiels || degats.degats_materiels || "—"}
            <br />
            <b>Financiers :</b>{" "}
            {degats.financiers || degats.degats_financiers || "—"}
            <br />
            <b>Humains :</b> {degats.humains || degats.degats_humains || "—"}
            <h5 className="text-primary mt-4">5. Mesures prises</h5>
            <b>Commissariat Général :</b>
            <br />
            {mesures.cg || mesures.commissariat || "—"}
            <br />
            <b>Inspection Générale :</b>
            <br />
            {mesures.ig || "—"}
            <div className="text-center mt-4">
              <Button
                style={{ backgroundColor: "#0A3D62" }}
                onClick={handleDownload}
                disabled={loadingPdf}
              >
                {loadingPdf ? "Préparation..." : "Imprimer / Exporter PDF"}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
}
