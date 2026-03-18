import React from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="bg-dark text-white vh-100 p-3" style={{ width: "220px" }}>
      <h2 className="mb-4">IG-PNC</h2>
      <Nav defaultActiveKey="/" className="flex-column">
        <Nav.Link
          as={Link}
          to="/"
          className={`text-white ${
            location.pathname === "/" ? "bg-secondary rounded" : ""
          }`}
        >
          Tableau de bord
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/search"
          className={`text-white ${
            location.pathname === "/search" ? "bg-secondary rounded" : ""
          }`}
        >
          Recherche
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/reports/new"
          className={`text-white ${
            location.pathname === "/reports/new" ? "bg-secondary rounded" : ""
          }`}
        >
          Nouveau Rapport
        </Nav.Link>
        <hr className="text-white" />
        <h5 className="text-white">Rapports</h5>
        <Nav.Link
          as={Link}
          to="/reports/victims"
          className={`text-white ${
            location.pathname === "/reports/victims"
              ? "bg-secondary rounded"
              : ""
          }`}
        >
          Victimes
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/reports/damages"
          className={`text-white ${
            location.pathname === "/reports/damages"
              ? "bg-secondary rounded"
              : ""
          }`}
        >
          Dégâts
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/reports/global"
          className={`text-white ${
            location.pathname === "/reports/global"
              ? "bg-secondary rounded"
              : ""
          }`}
        >
          Rapport Global
        </Nav.Link>
      </Nav>
    </div>
  );
}
