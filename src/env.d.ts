/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESEND_API_KEY: string
  readonly VITE_WEBAPP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 