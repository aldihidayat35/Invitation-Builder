-- Immutability guard (PRD §15.1, NFR-REL-001): published/versioned design and audit
-- records can never be updated or deleted, even by application bugs.
CREATE FUNCTION "forbid_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: records are immutable', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "template_versions_immutable" BEFORE UPDATE OR DELETE ON "template_versions"
  FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
--> statement-breakpoint
CREATE TRIGGER "published_snapshots_immutable" BEFORE UPDATE OR DELETE ON "published_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
--> statement-breakpoint
CREATE TRIGGER "audit_logs_immutable" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();