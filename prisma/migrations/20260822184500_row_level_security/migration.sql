-- ---------------------------------------------------------------------------
-- BellaGestao :: multi-tenant isolation (defence in depth, layer 3)
--
-- Layer 1: session -> membership resolution in the application.
-- Layer 2: every repository call goes through `withTenant()`.
-- Layer 3 (this file): PostgreSQL Row Level Security. Even a query with a
--          forgotten `where tenantId` returns zero rows.
--
-- Two GUCs carry the request context, set with `set_config(..., true)` inside
-- the transaction that runs the query:
--   app.current_tenant_id -> active tenant
--   app.current_user_id   -> authenticated user (needed before a tenant is
--                            chosen, e.g. to list the user's salons)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

-- --- application role -------------------------------------------------------
-- The runtime connects with this role. It is NOT the table owner and has no
-- BYPASSRLS, so the policies below always apply.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bella_app') THEN
    BEGIN
      EXECUTE 'CREATE ROLE bella_app NOLOGIN';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'bella_app role missing and cannot be created here; create it manually.';
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bella_app') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO bella_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bella_app';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bella_app';
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO bella_app';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bella_app';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bella_app';
  END IF;
END $$;

-- --- generic tenant_id policy ----------------------------------------------
-- Applied to every table that carries a tenant_id column. `tenants`,
-- `memberships` and `users` get bespoke policies further down.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('memberships', 'audit_logs')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', rec.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
         USING (tenant_id = app_current_tenant_id())
         WITH CHECK (tenant_id = app_current_tenant_id())',
      rec.table_name
    );
  END LOOP;
END $$;

-- --- tenants ----------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants
  USING (
    id = app_current_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = tenants.id
        AND m.user_id = app_current_user_id()
    )
  )
  WITH CHECK (id = app_current_tenant_id());

-- --- memberships ------------------------------------------------------------
-- Readable inside the active tenant, and by the user who owns the membership
-- (that is how the tenant switcher is built before a tenant is selected).
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.memberships;
CREATE POLICY tenant_isolation ON public.memberships
  USING (
    tenant_id = app_current_tenant_id()
    OR user_id = app_current_user_id()
  )
  WITH CHECK (tenant_id = app_current_tenant_id());

-- --- audit_logs -------------------------------------------------------------
-- tenant_id is nullable (platform level events); tenant rows stay isolated.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;
CREATE POLICY tenant_isolation ON public.audit_logs
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

-- --- users ------------------------------------------------------------------
-- A user sees itself, plus the users that share the active tenant (staff list).
-- Credential lookups (login, password reset) run through the privileged
-- connection, never through the tenant runtime connection.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_scope ON public.users;
CREATE POLICY user_scope ON public.users
  USING (
    id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = users.id
        AND m.tenant_id = app_current_tenant_id()
    )
  )
  WITH CHECK (id = app_current_user_id());

-- --- sessions & one-time tokens --------------------------------------------
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY['sessions', 'password_reset_tokens', 'email_verification_tokens']) AS table_name
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS user_scope ON public.%I', rec.table_name);
    EXECUTE format(
      'CREATE POLICY user_scope ON public.%I
         USING (user_id = app_current_user_id())
         WITH CHECK (user_id = app_current_user_id())',
      rec.table_name
    );
  END LOOP;
END $$;

-- --- global catalogues ------------------------------------------------------
-- plans / permissions / role_permissions are readable by everyone, writable
-- only through the privileged (owner) connection.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY['plans', 'permissions', 'role_permissions']) AS table_name
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', rec.table_name);
    EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT USING (true)', rec.table_name);
  END LOOP;
END $$;

-- webhook_events is written by billing webhooks through the privileged client.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
