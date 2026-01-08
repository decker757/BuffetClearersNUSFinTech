/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RLUSD_ISSUER: string
  readonly VITE_PLATFORM_WALLET_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
