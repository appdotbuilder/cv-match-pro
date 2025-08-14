import { serial, text, pgTable, timestamp, integer, json, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['JOB_SEEKER', 'JOB_PROVIDER', 'TALENT_ACQUISITION']);
export const cvStatusEnum = pgEnum('cv_status', ['ACTIVE', 'INACTIVE']);
export const projectStatusEnum = pgEnum('project_status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// CVs table (for job seekers)
export const cvsTable = pgTable('cvs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_path: text('file_path').notNull(),
  status: cvStatusEnum('status').notNull().default('INACTIVE'),
  parsed_data: json('parsed_data'), // AI-parsed CV data
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Search projects table
export const searchProjectsTable = pgTable('search_projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_by_user_id: integer('created_by_user_id').notNull().references(() => usersTable.id),
  status: projectStatusEnum('status').notNull().default('DRAFT'),
  criteria: json('criteria').notNull(), // Project criteria and weights
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Project CVs table (uploaded CVs for search projects)
export const projectCvsTable = pgTable('project_cvs', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => searchProjectsTable.id),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_path: text('file_path').notNull(),
  parsed_data: json('parsed_data'), // AI-parsed CV data
  score: numeric('score', { precision: 5, scale: 2 }), // Match score (0-100)
  ranking: integer('ranking'), // Ranking within the project
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  cvs: many(cvsTable),
  searchProjects: many(searchProjectsTable)
}));

export const cvsRelations = relations(cvsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [cvsTable.user_id],
    references: [usersTable.id]
  })
}));

export const searchProjectsRelations = relations(searchProjectsTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [searchProjectsTable.created_by_user_id],
    references: [usersTable.id]
  }),
  projectCvs: many(projectCvsTable)
}));

export const projectCvsRelations = relations(projectCvsTable, ({ one }) => ({
  project: one(searchProjectsTable, {
    fields: [projectCvsTable.project_id],
    references: [searchProjectsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type CV = typeof cvsTable.$inferSelect;
export type NewCV = typeof cvsTable.$inferInsert;

export type SearchProject = typeof searchProjectsTable.$inferSelect;
export type NewSearchProject = typeof searchProjectsTable.$inferInsert;

export type ProjectCV = typeof projectCvsTable.$inferSelect;
export type NewProjectCV = typeof projectCvsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  cvs: cvsTable,
  searchProjects: searchProjectsTable,
  projectCvs: projectCvsTable
};

export const allRelations = {
  usersRelations,
  cvsRelations,
  searchProjectsRelations,
  projectCvsRelations
};