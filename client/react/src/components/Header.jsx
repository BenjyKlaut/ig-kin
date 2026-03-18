import React from "react";
import { Navbar, Container } from "react-bootstrap";

export default function Header({ title }) {
  return (
    <Navbar bg="light" className="shadow-sm">
      <Container>
        <Navbar.Brand>{title}</Navbar.Brand>
      </Container>
    </Navbar>
  );
}
