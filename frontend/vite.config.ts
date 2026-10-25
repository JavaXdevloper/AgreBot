/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
