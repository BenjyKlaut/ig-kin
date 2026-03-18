// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expose une API minimale si besoin (ex: pour lancer impression native plus tard)
// Pour l'instant, rien d'exposé pour rester sûr.
contextBridge.exposeInMainWorld("__electron__", {
  /* aucun binding ici par défaut */
});
