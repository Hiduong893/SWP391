import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED') {
              console.log(`[vite-proxy] Backend is currently restarting. Connection refused.`);
              res.writeHead(503, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ error: 'Backend restarting', message: 'Vui lòng đợi backend khởi động xong.' }));
            }
          });
        }
      }
    }
  }
})
