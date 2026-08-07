import { Auth } from "@auth/core";

const base = { providers: [], pages: { signIn: "/login" }, callbacks: {}, secret: "x", trustHost: true };

const endpoints = ["session", "providers", "error", "csrf"];

console.log("--- basePath=/api/auth (correct) ---");
for (const a of endpoints) {
  const r = await Auth(new Request(`https://app.vercel.app/api/auth/${a}`), { ...base, basePath: "/api/auth" });
  console.log(`${a.padEnd(10)} => ${r.status}`);
}

console.log("--- basePath=/foo (mimics AUTH_URL with pathname) ---");
for (const a of endpoints) {
  const r = await Auth(new Request(`https://app.vercel.app/api/auth/${a}`), { ...base, basePath: "/foo" });
  console.log(`${a.padEnd(10)} => ${r.status} ${r.status === 400 ? (await r.json()) : ""}`);
}

console.log("--- basePath=/auth (core default) ---");
for (const a of endpoints) {
  const r = await Auth(new Request(`https://app.vercel.app/api/auth/${a}`), { ...base, basePath: "/auth" });
  console.log(`${a.padEnd(10)} => ${r.status}`);
}
