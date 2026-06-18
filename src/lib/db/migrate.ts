import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  if (!hasDb()) throw new Error("DATABASE_URL is not set");
  const db = getDb();

  // ─── Extend user_role enum ───
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'agency_owner', 'agency_team_member', 'client', 'admin', 'super_admin');
      ELSE
        BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency_team_member'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client'; EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;
    END $$;
  `);

  // ─── Core tables ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      email_verified TIMESTAMPTZ,
      image TEXT,
      password_hash TEXT,
      role user_role NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT true,
      phone VARCHAR(50),
      last_login_at TIMESTAMPTZ,
      login_count INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(3) NOT NULL UNIQUE,
      continent VARCHAR(50),
      agency_count INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      country_id UUID NOT NULL REFERENCES countries(id),
      state_province VARCHAR(255),
      agency_count INTEGER DEFAULT 0,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      icon VARCHAR(50),
      parent_id UUID,
      agency_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS industries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      icon VARCHAR(50),
      agency_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      tagline VARCHAR(500),
      description TEXT,
      logo TEXT,
      cover_image TEXT,
      website VARCHAR(500),
      email VARCHAR(255),
      phone VARCHAR(50),
      founded_year INTEGER,
      company_size VARCHAR(50),
      hourly_rate VARCHAR(50),
      min_project_size INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      is_verified BOOLEAN NOT NULL DEFAULT false,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      is_premium BOOLEAN NOT NULL DEFAULT false,
      country_id UUID REFERENCES countries(id),
      city_id UUID REFERENCES cities(id),
      address TEXT,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      social_links JSONB,
      meta_title VARCHAR(70),
      meta_description VARCHAR(160),
      average_rating DECIMAL(3,2) DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      total_leads INTEGER DEFAULT 0,
      profile_views INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_services (
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (agency_id, service_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_industries (
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
      PRIMARY KEY (agency_id, industry_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      company_name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50),
      project_description TEXT NOT NULL,
      budget VARCHAR(100),
      timeline VARCHAR(100),
      service_ids JSONB,
      industry_id UUID,
      country_id UUID,
      city_id UUID,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      overall_rating DECIMAL(3,2) NOT NULL,
      quality_rating DECIMAL(3,2),
      communication_rating DECIMAL(3,2),
      value_rating DECIMAL(3,2),
      timeliness_rating DECIMAL(3,2),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      project_type VARCHAR(255),
      project_budget VARCHAR(100),
      project_duration VARCHAR(100),
      company_name VARCHAR(255),
      company_size VARCHAR(50),
      is_verified BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      helpful_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);

  // ─── Make reviews.user_id nullable ───
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  // ─── Ensure all review columns exist (table may predate some columns) ───
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS quality_rating DECIMAL(3,2)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS communication_rating DECIMAL(3,2)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating DECIMAL(3,2)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS timeliness_rating DECIMAL(3,2)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS project_type VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS project_budget VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS project_duration VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0`);

  // ─── Add guest reviewer and review detail columns ───
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(100)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_email VARCHAR(255)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_job_title VARCHAR(100)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_company_industry VARCHAR(100)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS budget_rating DECIMAL(3,2)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS schedule_rating DECIMAL(3,2)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS collaboration_rating DECIMAL(3,2)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS objective TEXT
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS enjoyed TEXT
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS improvements TEXT
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_provided VARCHAR(255)
  `);
  await db.execute(sql`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN
  `);

  // ─── Ensure users table has needed columns ───
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  // ─── Signup OTPs (pre-registration verification) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS signup_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_signup_otps_email ON signup_otps(email)`);

  // ─── Refresh tokens ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      device_info JSONB,
      ip_address VARCHAR(45),
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`);

  // ─── OTP tokens ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS otp_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(6) NOT NULL,
      type VARCHAR(30) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_type ON otp_tokens(user_id, type)`);

  // ─── Email verification tokens ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Password reset tokens ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Login history ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(45),
      user_agent TEXT,
      device_type VARCHAR(30),
      location TEXT,
      status VARCHAR(20) NOT NULL,
      failure_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id)`);

  // ─── Device sessions ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS device_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_fingerprint TEXT NOT NULL,
      device_name TEXT,
      device_type VARCHAR(30),
      ip_address VARCHAR(45),
      last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_current BOOLEAN DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id)`);

  // ─── Permissions ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(30) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Role permissions ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role VARCHAR(30) NOT NULL,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role, permission_id)
    )
  `);

  // ─── User profiles ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT,
      phone VARCHAR(50),
      company_name VARCHAR(255),
      job_title VARCHAR(255),
      website VARCHAR(500),
      avatar_url TEXT,
      timezone VARCHAR(100),
      language VARCHAR(10) DEFAULT 'en',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Agency team members ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      permissions JSONB DEFAULT '[]',
      invited_by UUID REFERENCES users(id),
      invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(agency_id, user_id)
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agency_team_agency ON agency_team_members(agency_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agency_team_user ON agency_team_members(user_id)`);

  // ─── Notifications ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`);

  // ─── Notification preferences ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email_new_lead BOOLEAN DEFAULT true,
      email_new_review BOOLEAN DEFAULT true,
      email_lead_response BOOLEAN DEFAULT true,
      email_team_invite BOOLEAN DEFAULT true,
      email_agency_approved BOOLEAN DEFAULT true,
      email_weekly_digest BOOLEAN DEFAULT true,
      in_app_new_lead BOOLEAN DEFAULT true,
      in_app_new_review BOOLEAN DEFAULT true,
      in_app_lead_response BOOLEAN DEFAULT true,
      in_app_team_invite BOOLEAN DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Files / uploads (DB-based storage) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size INTEGER NOT NULL,
      data TEXT NOT NULL,
      entity_type VARCHAR(50),
      entity_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id)`);

  // ─── Lead activity logs ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lead_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      details JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activity_logs(lead_id)`);

  // ─── Review reports ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS review_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES users(id),
      reason VARCHAR(100) NOT NULL,
      details TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      resolved_by UUID REFERENCES users(id),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Agency portfolio ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_portfolio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      project_url TEXT,
      client_name VARCHAR(255),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_portfolio_agency ON agency_portfolio(agency_id)`);

  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS client_logo TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS project_schedule VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS project_size VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS challenge TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS approach TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS results TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS services_provided TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

  // ─── SEO metadata ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS seo_metadata (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_path VARCHAR(500) NOT NULL UNIQUE,
      title VARCHAR(70),
      description VARCHAR(160),
      og_image TEXT,
      canonical_url TEXT,
      robots VARCHAR(100),
      structured_data JSONB,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Audit logs (was missing!) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID,
      old_values JSONB,
      new_values JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);

  // ─── Search logs (was missing!) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS search_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query TEXT,
      filters JSONB,
      results_count INTEGER,
      user_id UUID,
      ip_address VARCHAR(45),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Ensure review_responses table exists (defined in Drizzle, may not be in DB) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS review_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Ensure review_votes table exists ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS review_votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      is_helpful BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Ensure lead_assignments table exists ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lead_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'sent' NOT NULL,
      credits_used INTEGER DEFAULT 1,
      viewed_at TIMESTAMP,
      responded_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Deduplicate lead_assignments, keeping the most-progressed row per
  //     (lead_id, agency_id). Required before the UNIQUE constraint below and
  //     fixes any historical duplicates that caused claims to appear to revert.
  await db.execute(sql`
    DELETE FROM lead_assignments
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY lead_id, agency_id
          ORDER BY (CASE status
              WHEN 'won' THEN 5 WHEN 'responded' THEN 4 WHEN 'claimed' THEN 3
              WHEN 'lost' THEN 2 WHEN 'viewed' THEN 1 ELSE 0 END) DESC,
            created_at ASC, id ASC
        ) AS rn
        FROM lead_assignments
      ) ranked
      WHERE rn > 1
    )
  `);

  // ─── Enforce one assignment per (lead, agency) so ON CONFLICT works and
  //     duplicate rows can never desync claim state again.
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE lead_assignments
        ADD CONSTRAINT uq_lead_assignments_lead_agency UNIQUE (lead_id, agency_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ─── Ensure messages table exists ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_assignment_id UUID NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // ─── Unique constraint for analytics upsert ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_analytics_daily (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      profile_views INTEGER DEFAULT 0,
      search_impressions INTEGER DEFAULT 0,
      website_clicks INTEGER DEFAULT 0,
      phone_clicks INTEGER DEFAULT 0,
      email_clicks INTEGER DEFAULT 0,
      lead_requests INTEGER DEFAULT 0,
      UNIQUE(agency_id, date)
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_analytics_agency_date ON agency_analytics_daily(agency_id, date)`);
  // If table already existed without the constraint, add it
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE agency_analytics_daily ADD CONSTRAINT uq_analytics_agency_date UNIQUE (agency_id, date);
    EXCEPTION WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ─── Plans (billing / monetization) ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plans (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'premium', 'pro', 'enterprise')),
      monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      monthly_lead_credits INTEGER NOT NULL DEFAULT 0,
      max_portfolio_items INTEGER NOT NULL DEFAULT 5,
      max_team_members INTEGER NOT NULL DEFAULT 1,
      features JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ─── Subscriptions ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES plans(id),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'expired')),
      billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
      current_period_start TIMESTAMPTZ DEFAULT NOW(),
      current_period_end TIMESTAMPTZ,
      canceled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agency_id)
    )
  `);

  // ─── Lead credit transactions ───
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lead_credit_transactions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type VARCHAR(30) NOT NULL CHECK (type IN ('grant', 'consume', 'refund', 'reset')),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ─── Seed default plans ───
  await db.execute(sql`
    INSERT INTO plans (name, tier, monthly_price, yearly_price, monthly_lead_credits, max_portfolio_items, max_team_members, features, sort_order) VALUES
      ('Free', 'free', 0, 0, 1, 5, 1, '{"basicProfile":true,"reviews":true,"basicAnalytics":true}', 1),
      ('Premium', 'premium', 49, 470, 10, 20, 5, '{"basicProfile":true,"reviews":true,"basicAnalytics":true,"enhancedProfile":true,"prioritySearch":true,"reviewTools":true}', 2),
      ('Pro', 'pro', 149, 1430, 30, -1, -1, '{"basicProfile":true,"reviews":true,"basicAnalytics":true,"enhancedProfile":true,"prioritySearch":true,"reviewTools":true,"featuredPlacement":true,"apiAccess":true,"advancedAnalytics":true}', 3),
      ('Enterprise', 'enterprise', 499, 4790, -1, -1, -1, '{"basicProfile":true,"reviews":true,"basicAnalytics":true,"enhancedProfile":true,"prioritySearch":true,"reviewTools":true,"featuredPlacement":true,"apiAccess":true,"advancedAnalytics":true,"dedicatedManager":true,"sla":true,"customBranding":true}', 4)
    ON CONFLICT DO NOTHING
  `);

  // ─── Seed RBAC permissions ───
  await seedPermissions(db);

  return { success: true, message: "All migrations and seeds completed" };
}

async function seedPermissions(db: ReturnType<typeof getDb>) {
  const perms = [
    { name: "users.read", resource: "users", action: "read" },
    { name: "users.create", resource: "users", action: "create" },
    { name: "users.update", resource: "users", action: "update" },
    { name: "users.delete", resource: "users", action: "delete" },
    { name: "users.manage", resource: "users", action: "manage" },
    { name: "agencies.read", resource: "agencies", action: "read" },
    { name: "agencies.create", resource: "agencies", action: "create" },
    { name: "agencies.update", resource: "agencies", action: "update" },
    { name: "agencies.delete", resource: "agencies", action: "delete" },
    { name: "agencies.manage", resource: "agencies", action: "manage" },
    { name: "agencies.approve", resource: "agencies", action: "approve" },
    { name: "reviews.read", resource: "reviews", action: "read" },
    { name: "reviews.create", resource: "reviews", action: "create" },
    { name: "reviews.update", resource: "reviews", action: "update" },
    { name: "reviews.delete", resource: "reviews", action: "delete" },
    { name: "reviews.moderate", resource: "reviews", action: "moderate" },
    { name: "leads.read", resource: "leads", action: "read" },
    { name: "leads.create", resource: "leads", action: "create" },
    { name: "leads.update", resource: "leads", action: "update" },
    { name: "leads.manage", resource: "leads", action: "manage" },
    { name: "admin.read", resource: "admin", action: "read" },
    { name: "admin.manage", resource: "admin", action: "manage" },
    { name: "analytics.read", resource: "analytics", action: "read" },
    { name: "files.create", resource: "files", action: "create" },
    { name: "files.read", resource: "files", action: "read" },
    { name: "files.delete", resource: "files", action: "delete" },
    { name: "files.manage", resource: "files", action: "manage" },
    { name: "notifications.read", resource: "notifications", action: "read" },
    { name: "notifications.manage", resource: "notifications", action: "manage" },
    { name: "team_members.manage", resource: "team_members", action: "manage" },
    { name: "billing.manage", resource: "billing", action: "manage" },
    { name: "content.manage", resource: "content", action: "manage" },
    { name: "seo.manage", resource: "seo", action: "manage" },
  ];

  for (const p of perms) {
    await db.execute(sql`
      INSERT INTO permissions (name, resource, action, description)
      VALUES (${p.name}, ${p.resource}, ${p.action}, ${p.name})
      ON CONFLICT (name) DO NOTHING
    `);
  }

  const rolePermMap: Record<string, string[]> = {
    super_admin: perms.map((p) => p.name),
    admin: [
      "users.read", "users.update", "agencies.read", "agencies.update", "agencies.approve",
      "reviews.read", "reviews.moderate", "leads.read", "admin.read",
      "analytics.read", "files.manage", "notifications.manage", "content.manage", "seo.manage",
    ],
    agency_owner: [
      "agencies.create", "agencies.read", "agencies.update", "agencies.delete",
      "reviews.read", "leads.read", "leads.update", "team_members.manage",
      "analytics.read", "billing.manage", "notifications.read", "files.create", "files.read", "files.delete",
    ],
    agency_team_member: [
      "agencies.read", "agencies.update", "leads.read", "leads.update",
      "reviews.read", "analytics.read", "notifications.read", "files.create", "files.read",
    ],
    client: [
      "agencies.read", "reviews.create", "reviews.read", "reviews.update", "reviews.delete",
      "leads.create", "leads.read", "notifications.read", "files.create", "files.read",
    ],
    user: ["agencies.read", "reviews.read", "notifications.read"],
  };

  for (const [role, permNames] of Object.entries(rolePermMap)) {
    for (const permName of permNames) {
      await db.execute(sql`
        INSERT INTO role_permissions (role, permission_id)
        SELECT ${role}, id FROM permissions WHERE name = ${permName}
        ON CONFLICT DO NOTHING
      `);
    }
  }
}
