import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 4 MB: el tope de un extracto por la web es 1 MB y el del archivo madre 2 MB
      // (lib/extractos/limites.ts); el resto es margen del formulario.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
