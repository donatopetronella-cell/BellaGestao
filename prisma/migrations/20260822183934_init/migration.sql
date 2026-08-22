-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MANAGER', 'RECEPTIONIST', 'PROFESSIONAL', 'FINANCE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO', 'STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CHARGEBACK', 'CANCELED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'FINISHED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('INTERNAL', 'ONLINE', 'WHATSAPP', 'IMPORT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'INSTALLMENT', 'LOYALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "CommissionKind" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionTarget" AS ENUM ('SERVICE', 'PRODUCT', 'ALL');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancialKind" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SALE', 'IN', 'OUT', 'WITHDRAWAL', 'REINFORCEMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE', 'SALE', 'SERVICE_USE', 'ADJUSTMENT', 'LOSS', 'RETURN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "SaleItemKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "ChemicalProcedure" AS ENUM ('COLORING', 'BLEACHING', 'PROGRESSIVE', 'RELAXING', 'BOTOX', 'TONING', 'RECONSTRUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('BEFORE', 'AFTER', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('REACTIVATION', 'BIRTHDAY', 'PROMOTION', 'REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'FINISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LoyaltyMode" AS ENUM ('POINTS', 'CASHBACK', 'VISITS');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_CREATED', 'APPOINTMENT_CANCELED', 'LOW_STOCK', 'PAYMENT_DUE', 'BIRTHDAY', 'INACTIVE_CLIENT', 'COMMISSION_AVAILABLE', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "active_tenant_id" UUID,
    "active_branch_id" UUID,
    "ip" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "logo_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "onboarding_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" UUID NOT NULL,
    "appointment_interval_min" INTEGER NOT NULL DEFAULT 15,
    "cancellation_policy_hours" INTEGER NOT NULL DEFAULT 24,
    "cancellation_policy_text" TEXT,
    "online_booking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "online_booking_lead_hours" INTEGER NOT NULL DEFAULT 2,
    "reminder_24h_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_2h_enabled" BOOLEAN NOT NULL DEFAULT true,
    "monthly_revenue_goal" DECIMAL(12,2),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "timezone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_opening_hours" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_min" INTEGER NOT NULL,
    "end_min" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "branch_id" UUID,
    "professional_id" UUID,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "branch_id" UUID,
    "token_hash" TEXT NOT NULL,
    "invited_by_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "MemberRole" NOT NULL,
    "permission_code" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permission_code")
);

-- CreateTable
CREATE TABLE "member_permission_overrides" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "permission_code" TEXT NOT NULL,
    "allow" BOOLEAN NOT NULL,

    CONSTRAINT "member_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "document" TEXT,
    "birth_date" DATE,
    "zip_code" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "preferences" TEXT,
    "allergies" TEXT,
    "source" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferred_professional_id" UUID,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),
    "first_visit_at" TIMESTAMP(3),
    "last_visit_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_hair_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "hair_type" TEXT,
    "length" TEXT,
    "curvature" TEXT,
    "texture" TEXT,
    "condition" TEXT,
    "scalp" TEXT,
    "previous_procedures" TEXT,
    "allergies" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_hair_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "appointment_id" UUID,
    "professional_id" UUID,
    "procedure" "ChemicalProcedure" NOT NULL,
    "brand" TEXT,
    "product_name" TEXT,
    "formula" JSONB NOT NULL DEFAULT '[]',
    "oxidant_volume" INTEGER,
    "oxidant_ml" INTEGER,
    "pause_minutes" INTEGER,
    "result" TEXT,
    "notes" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chemical_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hair_formulas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID,
    "name" TEXT NOT NULL,
    "procedure" "ChemicalProcedure" NOT NULL,
    "brand" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "oxidant_volume" INTEGER,
    "oxidant_ml" INTEGER,
    "pause_minutes" INTEGER,
    "notes" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hair_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_photos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "appointment_id" UUID,
    "kind" "PhotoKind" NOT NULL DEFAULT 'OTHER',
    "storage_path" TEXT NOT NULL,
    "caption" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "specialty" TEXT,
    "photo_url" TEXT,
    "color" TEXT,
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hired_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_working_hours" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "branch_id" UUID,
    "weekday" INTEGER NOT NULL,
    "start_min" INTEGER NOT NULL,
    "end_min" INTEGER NOT NULL,
    "break_start_min" INTEGER,
    "break_end_min" INTEGER,

    CONSTRAINT "professional_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_time_off" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "professional_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_kind" "CommissionKind" NOT NULL DEFAULT 'PERCENT',
    "commission_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_professionals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "price" DECIMAL(12,2),
    "duration_minutes" INTEGER,
    "commission_value" DECIMAL(12,2),

    CONSTRAINT "service_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_supplies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "service_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AppointmentSource" NOT NULL DEFAULT 'INTERNAL',
    "notes" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "confirmed_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "supplier_id" UUID,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "is_for_sale" BOOLEAN NOT NULL DEFAULT true,
    "is_supply" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "reason" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID,
    "professional_id" UUID,
    "appointment_id" UUID,
    "cash_register_id" UUID,
    "number" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SaleStatus" NOT NULL DEFAULT 'OPEN',
    "sold_by_id" UUID,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMP(3),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "kind" "SaleItemKind" NOT NULL,
    "product_id" UUID,
    "service_id" UUID,
    "professional_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "cash_register_id" UUID,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "opening_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closing_amount" DECIMAL(12,2),
    "expected_amount" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "opened_by_id" UUID,
    "closed_by_id" UUID,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cash_register_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FinancialKind" NOT NULL,
    "color" TEXT,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenues" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "category_id" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod",
    "status" "FinancialStatus" NOT NULL DEFAULT 'SETTLED',
    "due_date" DATE,
    "received_at" TIMESTAMP(3),
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "category_id" UUID,
    "supplier_id" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod",
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" DATE,
    "paid_at" TIMESTAMP(3),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID,
    "service_id" UUID,
    "product_id" UUID,
    "applies_to" "CommissionTarget" NOT NULL DEFAULT 'ALL',
    "kind" "CommissionKind" NOT NULL DEFAULT 'PERCENT',
    "value" DECIMAL(12,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "appointment_id" UUID,
    "sale_item_id" UUID,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "kind" "CommissionKind" NOT NULL,
    "rate_value" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "reference_month" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(12,2) NOT NULL,
    "price_yearly" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "features" JSONB NOT NULL DEFAULT '[]',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "provider_subscription_id" TEXT,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "trial_starts_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "paid_at" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "provider_template_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID,
    "appointment_id" UUID,
    "campaign_id" UUID,
    "template_id" UUID,
    "to_phone" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL DEFAULT 'CUSTOM',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "template_id" UUID,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "stats" JSONB NOT NULL DEFAULT '{}',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_targets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "message_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "campaign_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "mode" "LoyaltyMode" NOT NULL DEFAULT 'POINTS',
    "points_per_currency" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "currency_per_point" DECIMAL(12,4) NOT NULL DEFAULT 0.06,
    "min_redeem_points" INTEGER NOT NULL DEFAULT 500,
    "cashback_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "visits_for_reward" INTEGER NOT NULL DEFAULT 10,
    "reward_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "points_balance" INTEGER NOT NULL DEFAULT 0,
    "cashback_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "user_name" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT,
    "ip" TEXT,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_slug_key" ON "branches"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "branch_opening_hours_tenant_id_idx" ON "branch_opening_hours"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_opening_hours_branch_id_weekday_key" ON "branch_opening_hours"("branch_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_professional_id_key" ON "memberships"("professional_id");

-- CreateIndex
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenant_id_user_id_key" ON "memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_tenant_id_idx" ON "invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "member_permission_overrides_tenant_id_idx" ON "member_permission_overrides"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_permission_overrides_membership_id_permission_code_key" ON "member_permission_overrides"("membership_id", "permission_code");

-- CreateIndex
CREATE INDEX "clients_tenant_id_name_idx" ON "clients"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "clients_tenant_id_phone_idx" ON "clients"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "clients_tenant_id_last_visit_at_idx" ON "clients"("tenant_id", "last_visit_at");

-- CreateIndex
CREATE INDEX "clients_tenant_id_birth_date_idx" ON "clients"("tenant_id", "birth_date");

-- CreateIndex
CREATE UNIQUE INDEX "client_hair_profiles_client_id_key" ON "client_hair_profiles"("client_id");

-- CreateIndex
CREATE INDEX "client_hair_profiles_tenant_id_idx" ON "client_hair_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "chemical_history_tenant_id_client_id_performed_at_idx" ON "chemical_history"("tenant_id", "client_id", "performed_at");

-- CreateIndex
CREATE INDEX "hair_formulas_tenant_id_client_id_idx" ON "hair_formulas"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "client_photos_tenant_id_client_id_taken_at_idx" ON "client_photos"("tenant_id", "client_id", "taken_at");

-- CreateIndex
CREATE INDEX "professionals_tenant_id_is_active_idx" ON "professionals"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "professional_working_hours_tenant_id_idx" ON "professional_working_hours"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_working_hours_professional_id_weekday_key" ON "professional_working_hours"("professional_id", "weekday");

-- CreateIndex
CREATE INDEX "professional_time_off_tenant_id_professional_id_starts_at_idx" ON "professional_time_off"("tenant_id", "professional_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_tenant_id_name_key" ON "service_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "services_tenant_id_is_active_idx" ON "services"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "service_professionals_tenant_id_idx" ON "service_professionals"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_professionals_service_id_professional_id_key" ON "service_professionals"("service_id", "professional_id");

-- CreateIndex
CREATE INDEX "service_supplies_tenant_id_idx" ON "service_supplies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_supplies_service_id_product_id_key" ON "service_supplies"("service_id", "product_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_starts_at_idx" ON "appointments"("tenant_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_professional_id_starts_at_idx" ON "appointments"("tenant_id", "professional_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_client_id_starts_at_idx" ON "appointments"("tenant_id", "client_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "appointment_services_tenant_id_appointment_id_idx" ON "appointment_services"("tenant_id", "appointment_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_name_key" ON "product_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_name_idx" ON "products"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_tenant_id_idx" ON "inventory"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_branch_id_product_id_key" ON "inventory"("branch_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_tenant_id_product_id_created_at_idx" ON "inventory_movements"("tenant_id", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_appointment_id_key" ON "sales"("appointment_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_sold_at_idx" ON "sales"("tenant_id", "sold_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenant_id_number_key" ON "sales"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "sale_items_tenant_id_sale_id_idx" ON "sale_items"("tenant_id", "sale_id");

-- CreateIndex
CREATE INDEX "sale_payments_tenant_id_sale_id_idx" ON "sale_payments"("tenant_id", "sale_id");

-- CreateIndex
CREATE INDEX "cash_registers_tenant_id_branch_id_status_idx" ON "cash_registers"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_cash_register_id_idx" ON "cash_movements"("tenant_id", "cash_register_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_tenant_id_kind_name_key" ON "financial_categories"("tenant_id", "kind", "name");

-- CreateIndex
CREATE INDEX "revenues_tenant_id_received_at_idx" ON "revenues"("tenant_id", "received_at");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_due_date_idx" ON "expenses"("tenant_id", "due_date");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_paid_at_idx" ON "expenses"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "commission_rules_tenant_id_priority_idx" ON "commission_rules"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "commissions_tenant_id_professional_id_reference_month_idx" ON "commissions"("tenant_id", "professional_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_created_at_idx" ON "payments"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_tenant_id_code_key" ON "whatsapp_templates"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenant_id_status_scheduled_at_idx" ON "whatsapp_messages"("tenant_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenant_id_client_id_idx" ON "whatsapp_messages"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "campaign_targets_tenant_id_idx" ON "campaign_targets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_targets_campaign_id_client_id_key" ON "campaign_targets"("campaign_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_tenant_id_key" ON "loyalty_programs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_client_id_key" ON "loyalty_accounts"("client_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tenant_id_idx" ON "loyalty_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_tenant_id_account_id_created_at_idx" ON "loyalty_transactions"("tenant_id", "account_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_read_at_idx" ON "notifications"("tenant_id", "user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_entity_id_idx" ON "audit_logs"("tenant_id", "entity", "entity_id");

-- CreateIndex
CREATE INDEX "consent_records_tenant_id_client_id_idx" ON "consent_records"("tenant_id", "client_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_opening_hours" ADD CONSTRAINT "branch_opening_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_preferred_professional_id_fkey" FOREIGN KEY ("preferred_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_hair_profiles" ADD CONSTRAINT "client_hair_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_hair_profiles" ADD CONSTRAINT "client_hair_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_history" ADD CONSTRAINT "chemical_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_history" ADD CONSTRAINT "chemical_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_history" ADD CONSTRAINT "chemical_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_history" ADD CONSTRAINT "chemical_history_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hair_formulas" ADD CONSTRAINT "hair_formulas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hair_formulas" ADD CONSTRAINT "hair_formulas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_working_hours" ADD CONSTRAINT "professional_working_hours_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_working_hours" ADD CONSTRAINT "professional_working_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_time_off" ADD CONSTRAINT "professional_time_off_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_supplies" ADD CONSTRAINT "service_supplies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_supplies" ADD CONSTRAINT "service_supplies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
