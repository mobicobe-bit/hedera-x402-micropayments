/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_ID: string;
  readonly VITE_TREASURY_ID: string;
  readonly VITE_PRICE_PER_TOKEN_TINYBARS: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}