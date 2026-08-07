import { readFileSync } from "node:fs";

function loadEnvVars() {
  // Mimic Next.js .env loading (simple parse)
  const out = { ...process.env };
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}

// Verbatim copy of @auth/core/lib/utils/env.js setEnvDefaults
function coreSetEnvDefaults(envObject, config, suppressBasePathWarning = false) {
  try {
    const url = envObject.AUTH_URL;
    if (url) {
      if (config.basePath) {
        if (!suppressBasePathWarning) console.log("  [core] warn env-url-basepath-redundant");
      } else {
        config.basePath = new URL(url).pathname;
      }
    }
  } catch {}
  finally {
    config.basePath ?? (config.basePath = `/auth`);
  }
  if (!config.secret?.length) {
    config.secret = [];
    const secret = envObject.AUTH_SECRET;
    if (secret) config.secret.push(secret);
    for (const i of [1, 2, 3]) {
      const secret = envObject[`AUTH_SECRET_${i}`];
      if (secret) config.secret.unshift(secret);
    }
  }
  config.redirectProxyUrl ?? (config.redirectProxyUrl = envObject.AUTH_REDIRECT_PROXY_URL);
  config.trustHost ?? (config.trustHost = !!(envObject.AUTH_URL ?? envObject.AUTH_TRUST_HOST ?? envObject.VERCEL ?? envObject.CF_PAGES ?? envObject.NODE_ENV !== "production"));
  config.providers = config.providers.map((provider) => {
    const { id } = typeof provider === "function" ? provider({}) : provider;
    const ID = id.toUpperCase();
    for (const [key, value] of Object.entries(envObject)) {
      for (const [prefix, suffix] of [
        [`AUTH_${ID}_`, ["ID", "SECRET"]],
        [`AUTH_${ID}_`, ["CLIENT_ID", "CLIENT_SECRET"]],
        [`AUTH_${ID}_`, []],
      ])
        if (key.startsWith(prefix) && (!suffix.length || suffix.some((s) => key.endsWith(s)))) {
          if (typeof provider.options !== "object") continue;
          provider.options = { ...provider.options, ...envObject };
        }
    }
    return config;
  });
  return config;
}

// Verbatim copy of next-auth/lib/env.js setEnvDefaults
function nextSetEnvDefaults(config) {
  try {
    config.secret ?? (config.secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
    const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (!url) return;
    const { pathname } = new URL(url);
    if (pathname === "/") return;
    config.basePath || (config.basePath = pathname);
  } catch {
  } finally {
    config.basePath || (config.basePath = "/api/auth");
    coreSetEnvDefaults(process.env, config, true);
  }
}

const env = loadEnvVars();
Object.assign(process.env, env);
console.log("AUTH_URL:", JSON.stringify(process.env.AUTH_URL));
console.log("NEXTAUTH_URL:", JSON.stringify(process.env.NEXTAUTH_URL));
console.log("AUTH_SECRET set:", !!process.env.AUTH_SECRET);
console.log("NEXTAUTH_SECRET set:", !!process.env.NEXTAUTH_SECRET);
console.log("VERCEL:", JSON.stringify(process.env.VERCEL));
console.log("NODE_ENV:", JSON.stringify(process.env.NODE_ENV));

const c = { providers: [], pages: { signIn: "/login" }, callbacks: {} };
nextSetEnvDefaults(c);
console.log("\nFinal config:");
console.log("  basePath:", JSON.stringify(c.basePath));
console.log("  secret:", JSON.stringify(c.secret));
console.log("  trustHost:", c.trustHost);
