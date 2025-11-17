// Environment configuration

export const env = {
  API_URL: import.meta.env.VITE_BASE_DEV_URL,
  ENV: import.meta.env.VITE_ENV || "development",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  enableDebugLogs:
    import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" || import.meta.env.DEV,
} as const;
