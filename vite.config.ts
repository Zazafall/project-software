import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { defineConfig, Plugin } from 'vite';

function flaskBackendPlugin(): Plugin {
  return {
    name: 'flask-backend-launcher',
    configureServer() {
      const checkReq = http.get('http://127.0.0.1:5000/api/users', () => {
        // Backend is already alive
      });
      checkReq.on('error', () => {
        console.log('[Flask] Launching Python 3FA backend service on port 5000...');
        const py = spawn('python3', ['-m', 'backend.app'], {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        py.on('error', (err) => console.error('[Flask] Error starting backend:', err));
        process.on('exit', () => py.kill());
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), flaskBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
