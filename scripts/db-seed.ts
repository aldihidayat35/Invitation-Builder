import { ADMIN_DEFAULT_PASSWORD, ADMIN_USER_EMAIL, seedDev } from "../src/lib/db/seed";
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
          : ADMIN_DEFAULT_PASSWORD;
    const result = await seedDev(conn.db, { password });
    console.log("Seed OK:", result);
    console.log(`Admin login: ${ADMIN_USER_EMAIL} / ${ADMIN_DEFAULT_PASSWORD}`);
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
