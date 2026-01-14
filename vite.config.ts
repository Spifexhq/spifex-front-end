// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import fs from "node:fs";
import type { ServerOptions as HttpsServerOptions } from "node:https";

function readHttps(): HttpsServerOptions {
  const certPath = path.resolve(process.cwd(), "infra/https/certs/127.0.0.1.pem");
  const keyPath = path.resolve(process.cwd(), "infra/https/certs/127.0.0.1-key.pem");

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(
      [
        "HTTPS cert/key not found.",
        `cert: ${certPath}`,
        `key:  ${keyPath}`,
        "",
        "Copy the infra/https/certs folder into this frontend project (or regenerate with mkcert for 127.0.0.1).",
      ].join("\n"),
    );
  }

  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useHttps = env.VITE_HTTPS === "true";

  // IMPORTANT: use `undefined` when disabled (not `false`)
  const https = useHttps ? readHttps() : undefined;

  return {
    plugins: tailwindcss(),
    resolve: {
      alias: {
        src: path.resolve(__dirname, "src"),
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      https,
    },
    preview: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      https,
    },
  };
});
