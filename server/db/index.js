/**
 * Database Connection
 *
 * Provides PostgreSQL connection using Drizzle ORM.
 * Connection is established lazily on first use.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

// Database connection pool (lazy initialization)
let db = null;
let pool = null;

/**
 * Get database connection
 * Creates connection on first call, reuses on subsequent calls
 */
export function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.warn('DATABASE_URL not set - Forms Builder database features will be unavailable');
      return null;
    }

    try {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 10, // Maximum connections in pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      db = drizzle(pool, { schema });
      console.log('Forms Builder: PostgreSQL connection established');
    } catch (error) {
      console.error('Forms Builder: Failed to connect to PostgreSQL:', error.message);
      return null;
    }
  }

  return db;
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable() {
  const database = getDb();
  if (!database) return false;

  try {
    // Simple query to check connection
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Forms Builder: Database health check failed:', error.message);
    return false;
  }
}

/**
 * Initialize database tables
 * Creates tables if they don't exist
 */
export async function initializeDatabase() {
  const database = getDb();
  if (!database) {
    console.warn('Forms Builder: Skipping database initialization - no connection');
    return false;
  }

  try {
    // Create tables using raw SQL (Drizzle migrations would be better for production)
    await pool.query(`
      -- Forms table
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        slug UUID,
        schema JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        mode VARCHAR(20) NOT NULL DEFAULT 'simple',
        author_name VARCHAR(255),
        author_email VARCHAR(255),
        author_organization VARCHAR(255),
        github_user_id VARCHAR(255),
        github_username VARCHAR(255),
        cloned_from UUID,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        published_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
      CREATE INDEX IF NOT EXISTS idx_forms_github_user ON forms(github_user_id);
      CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);

      -- Submissions table for storing form responses
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        session_id UUID NOT NULL,
        is_test BOOLEAN NOT NULL DEFAULT false,
        field_values JSONB NOT NULL,
        proof_presentations JSONB,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions(form_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);

      -- Credential Library table for storing imported credentials
      CREATE TABLE IF NOT EXISTS credential_library (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        tags JSONB,
        ledger_schema_id VARCHAR(255) NOT NULL,
        ledger_cred_def_id VARCHAR(255) NOT NULL,
        orbit_schema_id VARCHAR(255),
        orbit_cred_def_id VARCHAR(255),
        attributes JSONB,
        issuer_did VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cred_lib_ledger_schema ON credential_library(ledger_schema_id);

      -- Proof Requests audit table for tracking proof requests
      CREATE TABLE IF NOT EXISTS proof_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proof_request_id VARCHAR(255) NOT NULL,
        cred_proof_id VARCHAR(255) NOT NULL,
        form_id UUID REFERENCES forms(id),
        session_id UUID NOT NULL,
        socket_session_id VARCHAR(255),
        state VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_proof_requests_cred_proof_id ON proof_requests(cred_proof_id);

      -- Proof Templates table for storing proof template definitions
      CREATE TABLE IF NOT EXISTS proof_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) DEFAULT '1.0.0',
        credential_format VARCHAR(50) NOT NULL DEFAULT 'anoncreds',
        requested_credentials JSONB NOT NULL DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        vdr_uri VARCHAR(500),
        published_to_verifier BOOLEAN NOT NULL DEFAULT false,
        author_name VARCHAR(255),
        author_email VARCHAR(255),
        github_user_id VARCHAR(255),
        github_username VARCHAR(255),
        cloned_from UUID,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        published_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_proof_templates_github_user ON proof_templates(github_user_id);
      CREATE INDEX IF NOT EXISTS idx_proof_templates_status ON proof_templates(status);
      CREATE INDEX IF NOT EXISTS idx_proof_templates_credential_format ON proof_templates(credential_format);
      CREATE INDEX IF NOT EXISTS idx_proof_templates_published_to_verifier ON proof_templates(published_to_verifier);

      -- Migration: Add new columns to existing proof_templates table if they don't exist
      DO $$
      BEGIN
        -- Add credential_format column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'proof_templates' AND column_name = 'credential_format') THEN
          ALTER TABLE proof_templates ADD COLUMN credential_format VARCHAR(50) NOT NULL DEFAULT 'anoncreds';
        END IF;

        -- Add requested_credentials column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'proof_templates' AND column_name = 'requested_credentials') THEN
          ALTER TABLE proof_templates ADD COLUMN requested_credentials JSONB NOT NULL DEFAULT '[]';
        END IF;

        -- Add metadata column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'proof_templates' AND column_name = 'metadata') THEN
          ALTER TABLE proof_templates ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        -- Add published_to_verifier column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'proof_templates' AND column_name = 'published_to_verifier') THEN
          ALTER TABLE proof_templates ADD COLUMN published_to_verifier BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    console.log('Forms Builder: Database tables initialized');
    return true;
  } catch (error) {
    console.error('Forms Builder: Failed to initialize database:', error.message);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('Forms Builder: PostgreSQL connection closed');
  }
}

export { schema };
