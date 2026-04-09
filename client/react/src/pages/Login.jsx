import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loginRequest } from "../api/api";
import { useNavigate } from "react-router-dom";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";

export default function Login() {
  const { setToken } = useAuth();
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const response = await loginRequest(matricule, password);
      if (response.data.token) {
        setToken(response.data.token);
        navigate("/home");
      } else {
        setError("Matricule ou mot de passe incorrect");
      }
    } catch (err) {
      setError("Erreur lors de la connexion");
      console.error(err);
    }
  }

  return (
    <Container className="d-flex vh-100 justify-content-center align-items-center">
      <Row className="w-100">
        <Col md={{ span: 4, offset: 4 }}>
          <h2 className="text-center mb-4">Connexion IG-PNC</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Matricule"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100">
              Se connecter
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
