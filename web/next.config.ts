import type { NextConfig } from "next";

// Exportación estática (despliegue en Cloudflare Pages consumiendo la API v2
// ya desplegada): se activa con EXPORT_STATIC=1 en el build. En desarrollo no
// cambia nada (sigue el servidor Next con output: standalone).
const isStaticExport = process.env.EXPORT_STATIC === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  // El indicador flotante de Dev Tools se posicionaba ENCIMA de la barra de
  // navegación inferior y tapaba los botones (Inicio, Rutas…). Fuera.
  devIndicators: false,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  ...(isStaticExport ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
