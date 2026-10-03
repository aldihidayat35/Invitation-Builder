import { connectFromEnv } from "./lib/connect";

async function main(): Promise<void> {
  const conn = connectFromEnv();
  try {
    await conn.migrate();
    console.log("Migrations applied.");
  } finally {
    await conn.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
