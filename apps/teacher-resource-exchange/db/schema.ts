import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const resourceSuggestions = sqliteTable(
  "resource_suggestions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    provider: text("provider").notNull().default(""),
    resourceKind: text("resource_kind").notNull().default("Not sure"),
    whyUseful: text("why_useful").notNull(),
    submitterRole: text("submitter_role").notNull().default(""),
    submitterEmail: text("submitter_email").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_resource_suggestions_status_created_at").on(table.status, table.createdAt),
    index("idx_resource_suggestions_normalized_url").on(table.normalizedUrl),
  ],
);
