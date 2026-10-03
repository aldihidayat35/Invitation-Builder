import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Driver-agnostic database handle (node-postgres in prod, PGlite in dev/tests). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
