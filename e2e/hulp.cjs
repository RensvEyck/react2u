// Gedeeld door de browsertests: waar de site draait, waar de uitvoer heen gaat,
// de mails van de nep-Resend, de TOTP-code van de testbeheerder en SQL op de
// testdatabase. Alles via omgevingsvariabelen, zodat e2e/run.mjs (lokaal en in
// CI) het kan sturen; de standaardwaarden horen bij e2e/supabase/config.toml.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BASIS = process.env.E2E_BASIS || "http://localhost:3014";
const UIT = path.resolve(process.env.E2E_UIT || path.join(__dirname, "..", ".e2e", "uitvoer"));
const MAILS = path.join(UIT, "mails.jsonl");
const DB = process.env.E2E_DB_CONTAINER || "supabase_db_react2u-e2e";

/** De testbeheerder uit e2e/supabase/extra/testgebruiker.sql. */
const BEHEERDER = { email: "rens@react2u.nl", wachtwoord: "Test-wachtwoord-123" };

const mails = () => (fs.existsSync(MAILS) ? fs.readFileSync(MAILS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

/** De offertelink uit een mail (localhost of 127.0.0.1, met poort). */
const offerteLink = (html) => (html || "").match(/href="(https?:\/\/[^"]+\/offerte\/[a-f0-9]{48,})"/)?.[1];

function base32(s) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += a.indexOf(c).toString(2).padStart(5, "0");
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

/** RFC 6238: sha1, 30 seconden, 6 cijfers. */
function totp(secret, t = Date.now()) {
  const tel = Buffer.alloc(8);
  tel.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / 30)));
  const h = crypto.createHmac("sha1", base32(secret)).update(tel).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

/** Het geheim van de authenticator die e2e/run.mjs voor de testbeheerder instelt. */
const geheim = () => fs.readFileSync(path.join(UIT, "totp-geheim.txt"), "utf8").trim();

const sql = (q) => execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-tA", "-c", q]).toString().trim();

module.exports = { BASIS, UIT, MAILS, DB, BEHEERDER, mails, offerteLink, totp, geheim, sql };
