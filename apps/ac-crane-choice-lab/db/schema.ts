import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const craneSelections = sqliteTable(
  "crane_selections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    evaluator: text("evaluator").notNull(),
    scenarioId: text("scenario_id").notNull(),
    scenarioTitle: text("scenario_title").notNull(),
    category: text("category").notNull(),
    loadLb: integer("load_lb").notNull(),
    horizontalFt: integer("horizontal_ft").notNull(),
    verticalFt: integer("vertical_ft").notNull(),
    selectedCrane: text("selected_crane").notNull(),
    baselineCrane: text("baseline_crane").notNull(),
    confidence: text("confidence").notNull(),
    reasons: text("reasons").notNull(),
    note: text("note").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_crane_selections_created_at").on(table.createdAt),
    index("idx_crane_selections_scenario_id").on(table.scenarioId),
    uniqueIndex("idx_crane_selections_session_scenario").on(table.sessionId, table.scenarioId),
  ],
);
