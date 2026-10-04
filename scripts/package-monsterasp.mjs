// Assembles the MonsterASP upload package. Run after `npm run build`:
//   node scripts/package-monsterasp.mjs
// Copies public/static/web.config into .next/standalone and REMOVES the
// local database directory so uploads can never overwrite live user data.
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";

const root = process.cwd();
const out = path.join(root, ".next", "standalone");

const copyDir = (src, dest) => {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
};

copyDir(path.join(root, "public"), path.join(out, "public"));
copyDir(path.join(root, ".next", "static"), path.join(out, ".next", "static"));
cpSync(path.join(root, "web.config"), path.join(out, "web.config"));

// NEVER ship a database: the server creates data/stoke.db itself on boot.
rmSync(path.join(out, "data"), { recursive: true, force: true });

console.log("MonsterASP package ready in .next/standalone (no database included).");
console.log("Zip its CONTENTS and upload into /wwwroot.");
