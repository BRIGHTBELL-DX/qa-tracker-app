import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built assets work regardless of the GitHub Pages
  // repo path (https://<user>.github.io/<repo>/) without hardcoding the repo name.
  base: './',
  plugins: [react()],
  server: { port: 5174 },
})
