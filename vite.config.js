import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'https://api.microflat.ashtamtechnologies.com';

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
