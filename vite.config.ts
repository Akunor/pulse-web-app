import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
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
      // Expose env variables to the client
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_APP_TITLE': JSON.stringify(env.VITE_APP_TITLE),
      'process.env.VITE_WEBAPP_URL': JSON.stringify(env.VITE_WEBAPP_URL)
    }
  };
});
