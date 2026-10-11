CREATE OR REPLACE FUNCTION "forbid_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_permanent_deletion', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% on % is not allowed: records are immutable', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "published_snapshots_immutable" ON "published_snapshots";
--> statement-breakpoint
CREATE TRIGGER "published_snapshots_immutable" BEFORE UPDATE OR DELETE ON "published_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
