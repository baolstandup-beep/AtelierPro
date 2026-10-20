// Passerelle minimale imitant l'URL unique d'un projet Supabase pour les tests
// de bout en bout : /auth/v1 → GoTrue, /rest/v1 → PostgREST.
import http from "node:http";

const routes = [
  { prefix: "/auth/v1", target: process.env.AUTH_URL ?? "http://127.0.0.1:59999" },
  { prefix: "/rest/v1", target: process.env.REST_URL ?? "http://127.0.0.1:53000" },
];
const port = Number(process.env.PORT ?? 54321);

http
  .createServer((req, res) => {
    const route = routes.find((r) => req.url.startsWith(r.prefix));
    if (!route) {
      res.writeHead(404).end("not found");
      return;
    }
    const url = new URL(req.url.slice(route.prefix.length) || "/", route.target);
    const headers = { ...req.headers, host: url.host };
    const upstream = http.request(url, { method: req.method, headers }, (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    });
    upstream.on("error", () => res.writeHead(502).end("bad gateway"));
    req.pipe(upstream);
  })
  .listen(port, () => console.log(`gateway on :${port}`));
