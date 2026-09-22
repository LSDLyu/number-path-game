import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/number-path-game/",
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
  plugins: [react()],
});
