import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from "dotenv";

dotenv.config({ path: '../infra/.env' });

export default defineConfig(() => {
  // Charge toutes les vars d'env (y compris non prefixées VITE_) pour le dev server
  const port = Number(process.env.PORT_BACK || 5173);
  const apiPort = Number(process.env.PORT_API || 3000);

  return {
    plugins: [react()],
    resolve: { preserveSymlinks: true },
    base: '/', // en prod: app servi sur app.localhost => base absolue
    server: {
      port,
      fs: { allow: ['..'] },
      // En dev: on appelle toujours /api côté front, Vite proxie vers l'API locale
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
