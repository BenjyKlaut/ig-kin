import React from "react";
import { Table } from "react-bootstrap";

export default function DataTable({ items }) {
  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Date</th>
          <th>District</th>
          <th>Commune</th>
          <th>Auteur</th>
          <th>Résumé</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id}>
            <td>{it.date_faits}</td>
            <td>{it.district}</td>
            <td>{it.commune}</td>
            <td>{it.author}</td>
            <td>{it.resume}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
