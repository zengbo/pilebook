import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

if (!existsSync(".dev.vars")) {
  writeFileSync(
    ".dev.vars",
    [
      "DEV_EXPOSE_MAGIC_LINK=1",
      "APP_ORIGIN=http://127.0.0.1:4471",
      "EMAIL_PROVIDER=console",
      "STRIPE_SECRET_KEY=",
      "STRIPE_WEBHOOK_SECRET=",
      "RESEND_API_KEY=",
      "",
    ].join("\n"),
  );
}

execSync("npx wrangler d1 migrations apply pilebook --local", { stdio: "inherit" });
execSync("node --experimental-strip-types scripts/seed.mjs", { stdio: "inherit" });
