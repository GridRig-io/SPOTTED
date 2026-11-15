// Lets Node's built-in TypeScript support follow the same extensionless imports the apps' bundlers use ("./format", "./payments").
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith("./") || spec.startsWith("../")) && !/\\.[cm]?[jt]s$/.test(spec) && ctx.parentURL?.startsWith("file:")) {
    for (const ext of [".ts", "/index.ts"]) {
      const url = new URL(spec + ext, ctx.parentURL);
      const p = fileURLToPath(url);
      if (existsSync(p) && statSync(p).isFile()) return next(url.href, ctx);
    }
  }
  return next(spec, ctx);
}`));
