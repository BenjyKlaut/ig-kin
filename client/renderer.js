const axios = require("axios");
const API = "http://localhost:3001";
let token = null;

function el(id) {
  return document.getElementById(id);
}

el("btnLogin").addEventListener("click", async () => {
  el("loginMsg").textContent = "";
  const matricule = el("matricule").value;
  const password = el("password").value;
  try {
    const r = await axios.post(API + "/auth/login", { matricule, password });
    token = r.data.token;
    el("login").classList.add("hidden");
    el("app").classList.remove("hidden");
  } catch (err) {
    el("loginMsg").textContent = err.response?.data?.error || err.message;
  }
});

el("btnLogout").addEventListener("click", () => {
  token = null;
  el("app").classList.add("hidden");
  el("login").classList.remove("hidden");
});

el("btnSearch").addEventListener("click", async () => {
  const district = el("filterDistrict").value;
  const commune = el("filterCommune").value;
  try {
    const r = await axios.get(API + "/reports", {
      params: { district, commune },
      headers: { Authorization: "Bearer " + token },
    });
    const items = r.data.items;
    let html =
      "<table><tr><th>Date</th><th>District</th><th>Commune</th><th>Auteur</th><th>Resume</th></tr>";
    items.forEach((it) => {
      html += `<tr data-id="${it.id}"><td>${it.date_faits}</td><td>${
        it.district
      }</td><td>${it.commune}</td><td>${it.author || ""}</td><td>${
        it.resume || ""
      }</td></tr>`;
    });
    html += "</table>";
    el("results").innerHTML = html;
    document.querySelectorAll("#results tr[data-id]").forEach((tr) =>
      tr.addEventListener("click", async () => {
        const id = tr.getAttribute("data-id");
        const d = await axios.get(API + "/reports/" + id, {
          headers: { Authorization: "Bearer " + token },
        });
        showDetail(d.data);
      })
    );
  } catch (err) {
    el("results").textContent = err.response?.data?.error || err.message;
  }
});

el("btnNew").addEventListener("click", () => {
  el("formReport").classList.remove("hidden");
});

el("btnCancelReport").addEventListener("click", () => {
  el("formReport").classList.add("hidden");
});

el("btnSaveReport").addEventListener("click", async () => {
  const payload = {
    district: el("r_district").value,
    commune: el("r_commune").value,
    date_faits: el("r_date").value,
    resume: el("r_resume").value,
    contenu: el("r_contenu").value,
    degats: {},
  };
  try {
    const r = await axios.post(API + "/reports", payload, {
      headers: { Authorization: "Bearer " + token },
    });
    el("saveMsg").textContent = "Rapport créé: " + r.data.id;
    el("formReport").classList.add("hidden");
  } catch (err) {
    el("saveMsg").textContent = err.response?.data?.error || err.message;
  }
});

function showDetail(d) {
  el("detail").classList.remove("hidden");
  el("detail").innerHTML = `<h3>Rapport ${d.id}</h3><p><strong>Date:</strong> ${
    d.date_faits
  }</p><p><strong>Localisation:</strong> ${d.district} / ${d.commune} / ${
    d.quartier || ""
  }</p><p><strong>Auteur:</strong> ${
    d.author?.display_name || ""
  }</p><p><strong>Contenu:</strong><br/>${d.contenu}</p>`;
}
