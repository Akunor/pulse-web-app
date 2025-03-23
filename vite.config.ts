import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
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
});
