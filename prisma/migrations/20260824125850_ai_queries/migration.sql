-- CreateTable
CREATE TABLE "ai_queries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "grounded" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_queries_tenant_id_created_at_idx" ON "ai_queries"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security (layer 3 of tenant isolation, same policy shape as
-- every other tenant-scoped table — see 20260822184500_row_level_security).
ALTER TABLE "ai_queries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ai_queries"
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_queries" TO bella_app;
