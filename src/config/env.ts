// Environment configuration

export const env = {
  API_URL:
    import.meta.env.VITE_API_URL || "https://api.edulift.sierra.edu.sl/api/v1",
  ENV: import.meta.env.VITE_ENV || "development",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
