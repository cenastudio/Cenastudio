import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

const DEFAULT_PUBLIC_URL = "https://cenastudio-production.up.railway.app";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function seoHtmlPlugin(values: Record<string, string>): Plugin {
  return {
    name: "cenastudio-seo-html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return Object.entries(values).reduce(
          (result, [token, value]) => result.replaceAll(token, value),
          html,
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname);
  const env = loadEnv(mode, rootDir, "");
  const appName = env.VITE_APP_NAME?.trim() || "Cena Studio";
  const publicUrl = (env.VITE_PUBLIC_URL?.trim() || DEFAULT_PUBLIC_URL).replace(/\/$/, "");
  const seoTitle = env.VITE_APP_SEO_TITLE?.trim() || `${appName} — Software para Produtoras de Vídeo | Gestão com IA`;
  const description = env.VITE_APP_DESCRIPTION?.trim() ||
    "Software para produtoras de vídeo: gerencie clientes, projetos, arquivos e aprovações em um só lugar. Gere documentos com IA e economize tempo operacional.";
  const socialImageUrl = `${publicUrl}/landing/product/dashboard.png`;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: appName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${publicUrl}/`,
    description,
    image: socialImageUrl,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  }).replace(/</g, "\\u003c");

  return {
    plugins: [
      seoHtmlPlugin({
        "__APP_NAME__": escapeHtml(appName),
        "__SEO_TITLE__": escapeHtml(seoTitle),
        "__SEO_DESCRIPTION__": escapeHtml(description),
        "__PUBLIC_URL__": escapeHtml(publicUrl),
        "__SOCIAL_IMAGE_URL__": escapeHtml(socialImageUrl),
        "__SEO_STRUCTURED_DATA__": structuredData,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "client", "src"),
        "@shared": path.resolve(rootDir, "shared"),
        "@assets": path.resolve(rootDir, "attached_assets"),
      },
    },
    envDir: rootDir,
    root: path.resolve(rootDir, "client"),
    build: {
      outDir: path.resolve(rootDir, "dist/public"),
      emptyOutDir: true,
      minify: "esbuild" as const,
      sourcemap: false,
    },
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY || "http://localhost:5000",
          changeOrigin: true,
        },
      },
      allowedHosts: ["localhost", "127.0.0.1"],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
