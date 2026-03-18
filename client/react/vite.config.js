import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  optimizeDeps: {
    include: ["react-bootstrap"],
  },
  build: {
    outDir: "dist", // Assure-toi que la sortie est bien 'dist'
    emptyOutDir: true, // Vide le dossier avant de reconstruire
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('"use client"')) return;
        warn(warning);
      },
    },
  },
});
