CREATE INDEX `idx_crane_selections_created_at` ON `crane_selections` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crane_selections_scenario_id` ON `crane_selections` (`scenario_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crane_selections_session_scenario` ON `crane_selections` (`session_id`,`scenario_id`);