import { seedDev } from "../src/lib/db/seed";
import { connectFromEnv } from "./lib/connect";

async function main(): Promise<void> {
  const conn = connectFromEnv();
  try {
    await conn.migrate();
    const rawPassword = process.env.SEED_DEV_PASSWORD?.trim();
    const password =
      rawPassword && rawPassword.length > 0
        ? rawPassword
        : process.env.NODE_ENV === "production"
          ? undefined
          : "dev-password-change-me";
    const result = await seedDev(conn.db, { password });
    console.log("Seed OK:", result);
    if (password)
      console.log(`Dev login: ${"dev@example.test"} / (SEED_DEV_PASSWORD or the dev default)`);
  } finally {
    await conn.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
