import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for the MOT-UK frontend.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
