/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_WEBAPP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 