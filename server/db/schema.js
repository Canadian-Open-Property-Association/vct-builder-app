/**
 * Forms Builder Database Schema
 *
 * This schema defines the database tables for the Forms Builder app.
 * Using Drizzle ORM with PostgreSQL.
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// Forms table - stores form definitions
export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  slug: uuid('slug'), // Generated on publish, used for public URL
  schema: jsonb('schema').notNull(), // Form structure (sections, fields, etc.)
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft' | 'published'
  mode: varchar('mode', { length: 20 }).notNull().default('simple'), // 'simple' | 'advanced'

  // Author info (captured from COPA auth)
  authorName: varchar('author_name', { length: 255 }),
  authorEmail: varchar('author_email', { length: 255 }),
  authorOrganization: varchar('author_organization', { length: 255 }),

  // GitHub user ID from COPA auth (replaces JWT userId)
  githubUserId: varchar('github_user_id', { length: 255 }),
  githubUsername: varchar('github_username', { length: 255 }),

  // Cloning support
  clonedFrom: uuid('cloned_from'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  slugIdx: index('idx_forms_slug').on(table.slug),
  githubUserIdx: index('idx_forms_github_user').on(table.githubUserId),
  statusIdx: index('idx_forms_status').on(table.status),
}));

// Submissions table - stores form submissions (will be added in Increment 4)
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id),
  sessionId: uuid('session_id').notNull(),
  isTest: boolean('is_test').default(false).notNull(),
  fieldValues: jsonb('field_values').notNull(),
  proofPresentations: jsonb('proof_presentations'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
}, (table) => ({
  formIdx: index('idx_submissions_form').on(table.formId),
  submittedAtIdx: index('idx_submissions_submitted_at').on(table.submittedAt),
}));

// Credential Library table - stores imported credentials (will be added in Increment 5)
export const credentialLibrary = pgTable('credential_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  tags: jsonb('tags'),
  ledgerSchemaId: varchar('ledger_schema_id', { length: 255 }).notNull(),
  ledgerCredDefId: varchar('ledger_cred_def_id', { length: 255 }).notNull(),
  orbitSchemaId: varchar('orbit_schema_id', { length: 255 }),
  orbitCredDefId: varchar('orbit_cred_def_id', { length: 255 }),
  attributes: jsonb('attributes'),
  issuerDid: varchar('issuer_did', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ledgerSchemaIdx: index('idx_cred_lib_ledger_schema').on(table.ledgerSchemaId),
}));

// Proof Requests audit table - tracks proof requests (will be added in Increment 5)
export const proofRequests = pgTable('proof_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  proofRequestId: varchar('proof_request_id', { length: 255 }).notNull(),
  credProofId: varchar('cred_proof_id', { length: 255 }).notNull(),
  formId: uuid('form_id').references(() => forms.id),
  sessionId: uuid('session_id').notNull(),
  socketSessionId: varchar('socket_session_id', { length: 255 }),
  state: varchar('state', { length: 50 }), // 'verified' | 'failed' | 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  credProofIdIdx: index('idx_proof_requests_cred_proof_id').on(table.credProofId),
}));

// Proof Templates table - stores proof template definitions for the ecosystem
export const proofTemplates = pgTable('proof_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  purpose: text('purpose'), // What this template verifies (shown to holder)
  claims: jsonb('claims').notNull().default([]), // Array of Claim objects
  format: varchar('format', { length: 50 }).notNull().default('presentation-exchange'),

  // Metadata
  category: varchar('category', { length: 100 }).default('general'),
  version: varchar('version', { length: 50 }).default('1.0.0'),
  tags: jsonb('tags').default([]),

  // Status and publishing
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft' | 'published'
  vdrUri: varchar('vdr_uri', { length: 500 }), // URI after publishing to VDR

  // Author info (captured from COPA auth)
  authorName: varchar('author_name', { length: 255 }),
  authorEmail: varchar('author_email', { length: 255 }),
  githubUserId: varchar('github_user_id', { length: 255 }),
  githubUsername: varchar('github_username', { length: 255 }),

  // Cloning support
  clonedFrom: uuid('cloned_from'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
}, (table) => ({
  githubUserIdx: index('idx_proof_templates_github_user').on(table.githubUserId),
  statusIdx: index('idx_proof_templates_status').on(table.status),
  categoryIdx: index('idx_proof_templates_category').on(table.category),
}));
