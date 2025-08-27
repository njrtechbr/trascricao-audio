import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.REACT_APP_SUPABASE_URL),
        'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(env.REACT_APP_SUPABASE_ANON_KEY),
        'process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY),
        'import.meta.env.VITE_REACT_APP_SUPABASE_URL': JSON.stringify(env.REACT_APP_SUPABASE_URL),
        'import.meta.env.VITE_REACT_APP_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY),
        'import.meta.env.VITE_HUGGINGFACE_API_KEY': JSON.stringify(env.VITE_HUGGINGFACE_API_KEY),
        global: 'globalThis'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: [
          '@huggingface/inference',
          '@google/genai',
          '@supabase/supabase-js'
        ],
        exclude: ['electron']
      },
      esbuild: {
        target: 'esnext'
      }
    };
});
