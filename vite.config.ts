import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['next/server', '@supabase/auth-helpers-nextjs']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/server': 'next/dist/server',
        'next': 'next/dist'
      },
    },
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'import.meta.env.VITE_APP_TITLE': JSON.stringify(env.VITE_APP_TITLE),
      'import.meta.env.VITE_WEBAPP_URL': JSON.stringify(env.VITE_WEBAPP_URL)
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js']
          }
        }
      }
    }
  };
});
