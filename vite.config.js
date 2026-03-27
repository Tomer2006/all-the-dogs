import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/all-the-dogs/",
  build: {
    outDir: "docs",
  },
  plugins: [react()],
});
