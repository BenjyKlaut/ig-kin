import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { searchReports } from "../api/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Composant Home - Page du tableau de bord
 * Affiche les statistiques et les actions rapides pour l'application IG-PNC
 * Récupère le nombre total de rapports et les rapports d'aujourd'hui
 */
export default function Home() {
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Obtient le nombre total de rapports
      searchReports({}, token)
        .then((res) => {
          setStats((prev) => ({
            ...prev,
            total: res.data.total || res.data.items?.length || 0,
          }));
        })
        .catch(() => {});

      // Obtient le nombre de rapports d'aujourd'hui
      const today = new Date().toISOString().split("T")[0];
      searchReports({ date_faits: today }, token)
        .then((res) => {
          setStats((prev) => ({
            ...prev,
            today: res.data.total || res.data.items?.length || 0,
          }));
        })
        .catch(() => {});
    }
  }, [token]);

  return (
    <Layout title="Tableau de bord">
      <div className="container mt-4">
        <div className="row">
          {/* Cartes de statistiques */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Rapports totaux</h5>
                <p className="card-text display-4">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Rapports aujourd'hui</h5>
                <p className="card-text display-4">{stats.today}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h4>Actions rapides</h4>
          {/* Liens de navigation rapide utilisant le routeur */}
          <div className="list-group">
            <button
              onClick={() => navigate("/reports/new")}
              className="list-group-item list-group-item-action text-start"
              style={{ border: "1px solid #ddd", cursor: "pointer" }}
            >
              Créer un nouveau rapport
            </button>
            <button
              onClick={() => navigate("/search")}
              className="list-group-item list-group-item-action text-start"
              style={{ border: "1px solid #ddd", cursor: "pointer" }}
            >
              Rechercher des rapports
            </button>
            <button
              onClick={() => navigate("/reports/victims")}
              className="list-group-item list-group-item-action text-start"
              style={{ border: "1px solid #ddd", cursor: "pointer" }}
            >
              Rapports par victimes
            </button>
            <button
              onClick={() => navigate("/reports/damages")}
              className="list-group-item list-group-item-action text-start"
              style={{ border: "1px solid #ddd", cursor: "pointer" }}
            >
              Rapports par dégâts
            </button>
            <button
              onClick={() => navigate("/reports/global")}
              className="list-group-item list-group-item-action text-start"
              style={{ border: "1px solid #ddd", cursor: "pointer" }}
            >
              Rapports globaux
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
