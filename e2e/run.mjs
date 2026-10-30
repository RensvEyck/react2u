// De browsertests van de offertemodule van begin tot eind: een lokale
// Supabase-stack met alle migraties, de site als productiebuild, een nep-Resend
// die elke mail vastlegt, en dan e2e/offerte.cjs en e2e/vormen.cjs. Draait in
// GitHub Actions (.github/workflows/tests.yml) en lokaal met `npm run e2e`.
//
// Nodig: Docker en de Supabase CLI. Raakt .env.local niet aan: alle
// instellingen gaan als omgevingsvariabelen mee, en die winnen van .env-bestanden.
//
// Omgevingsvariabelen:
//   E2E_HOUDEN=1       stack na afloop laten draaien (om rond te kijken)
//   E2E_GEEN_BUILD=1   bestaande .next gebruiken (alleen als die met deze
//                      instellingen is gebouwd)
//   E2E_ALLEEN=offerte alleen één test (offerte of vormen)
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WERK = path.join(ROOT, ".e2e");
const STACK = path.join(WERK, "stack");
const UIT = path.join(WERK, "uitvoer");
const POORT = 3014;
const RESEND_POORT = 56399;
const BASIS = `http://localhost:${POORT}`;
const PROJECT = "react2u-e2e";
const DB = `supabase_db_${PROJECT}`;
// Diensten die de tests niet gebruiken: sneller opstarten, minder images in CI.
const ZONDER = "studio,imgproxy,mailpit,realtime,vector,logflare,edge-runtime,postgres-meta";

const NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const stap = (s) => console.log(`\n=== ${s}`);
const draai = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });
const lees = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", ...opts });
const psql = (sql) => execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql });

/**
 * De migraties in een vorm die `supabase start` slikt: doorgenummerd (er zijn
 * twee keer 0005), met drie testbestanden ertussen: de extensies vooraan, de
 * testbeheerder vóór de superadmin-migratie, en lege versies van twee
 * productiefuncties vóór 0016.
 */
function bereidStackVoor() {
  fs.rmSync(STACK, { recursive: true, force: true });
  const map = path.join(STACK, "supabase", "migrations");
  fs.mkdirSync(map, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "e2e", "supabase", "config.toml"), path.join(STACK, "supabase", "config.toml"));
  const extra = (naam) => fs.readFileSync(path.join(ROOT, "e2e", "supabase", "extra", naam), "utf8");
  const bestanden = fs.readdirSync(path.join(ROOT, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  let nr = 0;
  const schrijf = (naam, sql) => {
    nr += 10;
    fs.writeFileSync(path.join(map, `${String(nr).padStart(4, "0")}_${naam}`), sql);
  };
  schrijf("extensies.sql", extra("extensies.sql"));
  for (const f of bestanden) {
    const naam = f.replace(/^\d+_/, "");
    if (naam === "superadmin.sql") schrijf("testgebruiker.sql", extra("testgebruiker.sql"));
    if (naam === "rechten_functies.sql") schrijf("stubs_productie.sql", extra("stubs-productie.sql"));
    schrijf(naam, fs.readFileSync(path.join(ROOT, "supabase", "migrations", f), "utf8"));
  }
  console.log(`${bestanden.length} migraties klaargezet in ${path.relative(ROOT, map)}`);
}

/** Een nep-Resend: legt elke POST /emails vast in mails.jsonl en zegt 200. */
function nepResend() {
  const bestand = path.join(UIT, "mails.jsonl");
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      if (req.method === "POST" && req.url === "/emails") {
        fs.appendFileSync(bestand, JSON.stringify({ at: new Date().toISOString(), ...JSON.parse(body || "{}") }) + "\n");
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ id: `nep-${Date.now()}` }));
      }
      res.writeHead(404);
      res.end("{}");
    });
  });
  return new Promise((ok) => server.listen(RESEND_POORT, "127.0.0.1", () => ok(server)));
}

async function wachtOp(url, seconden) {
  for (let i = 0; i < seconden; i++) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      // nog niet bereikbaar
    }
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  throw new Error(`${url} kwam niet op binnen ${seconden} s`);
}

/** De testbeheerder een authenticator geven (tweestaps is verplicht, 0021); het geheim gaat naar de tests. */
async function stelAuthenticatorIn(url, anon) {
  const { createClient } = await import("@supabase/supabase-js");
  const { default: hulp } = await import("./hulp.cjs");
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { error: e1 } = await sb.auth.signInWithPassword({ email: hulp.BEHEERDER.email, password: hulp.BEHEERDER.wachtwoord });
  if (e1) throw e1;
  const { data, error: e2 } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `e2e-${Date.now()}` });
  if (e2) throw e2;
  const { error: e3 } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: hulp.totp(data.totp.secret) });
  if (e3) throw e3;
  fs.writeFileSync(path.join(UIT, "totp-geheim.txt"), data.totp.secret);
}

function test(naam, env) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [path.join(ROOT, "e2e", `${naam}.cjs`)], { stdio: "inherit", env });
    p.on("exit", (code) => ok(code ?? 1));
  });
}

let site;
let resend;
let stackDraait = false;

async function opruimen() {
  site?.kill("SIGTERM");
  resend?.close();
  if (stackDraait && !process.env.E2E_HOUDEN) {
    try {
      draai("supabase", ["stop", "--no-backup", "--workdir", STACK], { stdio: "ignore" });
    } catch {
      // al gestopt
    }
  }
}

async function main() {
  fs.rmSync(UIT, { recursive: true, force: true });
  fs.mkdirSync(UIT, { recursive: true });

  stap("Supabase-stack opbouwen");
  bereidStackVoor();
  try {
    draai("supabase", ["stop", "--no-backup", "--workdir", STACK], { stdio: "ignore" });
  } catch {
    // er draaide niets
  }
  draai("supabase", ["start", "--workdir", STACK, "-x", ZONDER]);
  stackDraait = true;
  const status = JSON.parse(lees("supabase", ["status", "-o", "json", "--workdir", STACK]));
  const url = status.API_URL;
  const anon = status.ANON_KEY;

  stap("Testgegevens");
  // De sleutel voor de bevestigingscode (0026): de server kent hem, de database alleen de hash.
  const sleutel = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(sleutel).digest("hex");
  psql(`insert into public.offerte_sleutel (hash) values ('${hash}') on conflict (id) do update set hash = excluded.hash;
insert into public.contact_messages (name, email, phone, subject, message)
values ('Piet Peters', 'piet@peters.test', '0612345678', 'Offerteaanvraag verzuimbegeleiding',
        E'Bedrijf: Fietsenmaker Peters\\nAantal medewerkers: 12\\nAansluiting: Casemanagement Compleet\\n\\nGraag een offerte.');`);
  await stelAuthenticatorIn(url, anon);
  resend = await nepResend();

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: BASIS,
    RESEND_API_KEY: "nep",
    RESEND_API_URL: `http://127.0.0.1:${RESEND_POORT}`,
    NOTIFY_FROM: "React2u <noreply@react2u.nl>",
    NOTIFY_TO: "info@test.local",
    NOTIFY_OFFERTE_TO: "sales@test.local",
    OFFERTE_SLEUTEL: sleutel,
    NEXT_TELEMETRY_DISABLED: "1",
  };

  if (!process.env.E2E_GEEN_BUILD) {
    stap("Site bouwen");
    draai(process.execPath, [NEXT, "build"], { cwd: ROOT, env });
  }
  stap("Site starten");
  // Rechtstreeks node met next, niet via npx: dan stopt SIGTERM ook echt de server.
  site = spawn(process.execPath, [NEXT, "start", "-p", String(POORT)], { cwd: ROOT, env, stdio: ["ignore", "inherit", "inherit"] });
  await wachtOp(BASIS, 90);

  const testEnv = { ...env, E2E_BASIS: BASIS, E2E_UIT: UIT, E2E_DB_CONTAINER: DB };
  const tests = process.env.E2E_ALLEEN ? [process.env.E2E_ALLEEN] : ["offerte", "vormen"];
  const mislukt = [];
  for (const t of tests) {
    stap(`Test: ${t}`);
    if ((await test(t, testEnv)) !== 0) mislukt.push(t);
  }
  return mislukt;
}

main()
  .then(async (mislukt) => {
    await opruimen();
    console.log(mislukt.length ? `\nMislukt: ${mislukt.join(", ")}. Uitvoer in ${path.relative(ROOT, UIT)}` : "\nAlle browsertests geslaagd.");
    process.exit(mislukt.length ? 1 : 0);
  })
  .catch(async (e) => {
    console.error(e);
    await opruimen();
    process.exit(2);
  });
