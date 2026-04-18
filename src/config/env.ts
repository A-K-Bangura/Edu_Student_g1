// Environment configuration
//
// Mixed content (HTTPS site → HTTP API): browsers block this. Production options:
// 1) Serve the API over HTTPS (recommended), set VITE_API_URL=https://your-api.example.com/api/v1
// 2) Proxy via Vercel: set VITE_API_URL=/api/v1 so requests stay same-origin HTTPS, and add a
//    rewrite in vercel.json from /api/v1/* to your HTTP backend (see repo vercel.json).

const rawApiUrl =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_DEV_URL ?? "";

/** Base URL for axios (may be absolute https, or a path like /api/v1 for same-origin proxy). */
export const API_URL = String(rawApiUrl).replace(/\/+$/, "");

export const env = {
  API_URL,
  ENV: import.meta.env.VITE_ENV || "development",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  enableDebugLogs:
    import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" || import.meta.env.DEV,
} as const;
