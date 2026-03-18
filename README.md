IG-PNC — Application de gestion des rapports sécuritaires

This repository is a minimal scaffold (prototype) for the IG-PNC desktop application.

Structure:

- backend/: Express + SQLite demo API
- client/: Electron minimal desktop shell + renderer UI
- db/: SQL schema (Postgresql-style) and notes
- docs/: API and user/technical docs

Quick start (requires Node.js >= 16):

1. Backend

```powershell
cd backend
npm install
npm run start
```

2. Client (in another terminal)

```powershell
cd client
npm install
npm run start
```

This scaffold is a starting point: production deployment should use proper TLS, hardened auth, Postgres, and a compiled native client (WPF or packaged Electron with auto-updater).
