API (minimal prototype)

Auth

- POST /auth/login
  - body: { matricule, password }
  - returns: { token }

Reports

- GET /reports
  - query: district, commune, quartier, date_debut, date_fin, degats_type, page, pageSize
  - returns: { items: [], total }
- GET /reports/:id
  - returns detail + writes audit log (CONSULTATION_DETAIL)
- POST /reports
  - body: report payload
  - creates report + writes audit log (CREATE_REPORT)

Audit

- (admin) GET /audit?user_id=&report_id=&action=&from=&to=

Notes:

- Prototype uses SQLite for convenience. Replace with Postgres in production.
- Authentication uses JWT in Authorization header: `Bearer <token>`.
