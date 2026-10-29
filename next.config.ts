import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 2 MB: el tope de un extracto por la web es 1 MB y el del archivo madre 512 KB
      // (lib/extractos/limites.ts); el resto es margen del formulario. El histórico va por script.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
