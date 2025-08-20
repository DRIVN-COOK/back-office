import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config({ path: '../infra/.env' })

export default defineConfig(() => {
  const port = Number(process.env.PORT_BACK || 5173)
  const apiPort = Number(process.env.PORT_API || 3000)

  return {
    plugins: [react()],
    resolve: {
      // IMPORTANT : évite 2 instances de React avec les symlinks
      dedupe: ['react', 'react-dom'],
      // preserveSymlinks: true, // <-- je conseille de l'enlever en dev
    },
    base: '/',
    server: {
      port,
      fs: { allow: ['..'] },
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    optimizeDeps: {
      // en cas de pépin, tu peux forcer Vite à re-prébundler
      // include: ['@drivn-cook/shared'],
      // ou au contraire l’exclure :
      // exclude: ['@drivn-cook/shared'],
    },
  }
})
