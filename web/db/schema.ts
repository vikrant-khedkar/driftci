import { pgTable, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';

// ─── Auth tables ──────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  apiKey: text('api_key').unique(), // for MCP / programmatic access
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(), // also the cookie token
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

// ─── App tables ───────────────────────────────────────────────────────

export const project = pgTable(
  'project',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    platform: text('platform', { enum: ['make', 'n8n'] }).notNull(),
    openapiSource: text('openapi_source').notNull(),

    // make
    makeApp: text('make_app'),
    makeVersion: text('make_version'),
    makeRegion: text('make_region'),
    makeTokenEnc: text('make_token_enc'), // AES-256-GCM ciphertext

    // n8n
    n8nMode: text('n8n_mode', { enum: ['local', 'repo'] }),
    n8nPath: text('n8n_path'),
    n8nRepo: text('n8n_repo'),
    n8nSubdir: text('n8n_subdir'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('project_user_idx').on(t.userId)],
);

export const scan = pgTable(
  'scan',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['ok', 'error'] }).notNull(),
    error: text('error'),
    durationMs: integer('duration_ms').notNull().default(0),

    breakingCount: integer('breaking_count').notNull().default(0),
    warningCount: integer('warning_count').notNull().default(0),
    infoCount: integer('info_count').notNull().default(0),
    scannedCount: integer('scanned_count').notNull().default(0),
    specCount: integer('spec_count').notNull().default(0),

    result: jsonb('result'), // full ScanResult (+ specMismatch)
    guidance: text('guidance'), // cached LLM migration guide (markdown)

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('scan_project_idx').on(t.projectId, t.createdAt)],
);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type Scan = typeof scan.$inferSelect;
