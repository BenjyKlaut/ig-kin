import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Home from "./pages/Home";
import SearchReports from "./pages/SearchReport";
import NewReport from "./pages/NewReport";
import EditReport from "./pages/EditReport";
import ReportDetail from "./pages/ReportDetail";
import VictimsReport from "./pages/VictimsReport";
import DamagesReport from "./pages/DamagesReport";
import GlobalReport from "./pages/GlobalReport";
import "./styles/adminTheme.css";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/search"
            element={
              <PrivateRoute>
                <SearchReports />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/new"
            element={
              <PrivateRoute>
                <NewReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/victims"
            element={
              <PrivateRoute>
                <VictimsReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/damages"
            element={
              <PrivateRoute>
                <DamagesReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/global"
            element={
              <PrivateRoute>
                <GlobalReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/:id/edit"
            element={
              <PrivateRoute>
                <EditReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <PrivateRoute>
                <ReportDetail />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
