import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static y ffprobe-static traen binarios nativos: no deben ser
  // empaquetados por el bundler o la ruta al binario deja de existir
  // (spawn .../ffmpeg-static/ffmpeg ENOENT). Se cargan en runtime desde
  // node_modules.
  // @remotion/bundler y @remotion/renderer también quedan fuera del bundle:
  // el bundler trae webpack/esbuild y el renderer binarios nativos y un
  // navegador headless — se cargan con require() nativo solo en el servidor.
  // sharp trae binarios nativos (libvips): fuera del bundle, se carga en
  // runtime. Lo usamos para normalizar las fotos del proyecto (HEIC→JPEG,
  // reencuadre EXIF, límite de tamaño) antes de mandarlas a la IA de visión.
  serverExternalPackages: [
    "ffmpeg-static",
    "ffprobe-static",
    "@remotion/bundler",
    "@remotion/renderer",
    "sharp",
  ],
  experimental: {
    // Con proxy.ts activo, Next buffea el cuerpo de cada petición y lo corta
    // en 10 MB por defecto — rompería la subida de multimedia a los
    // proyectos. Los videos grandes (hasta 800 MB) se comprimen en el
    // servidor tras recibirse.
    proxyClientMaxBodySize: "850mb",
  },
};

export default nextConfig;
