CREATE TABLE `resource_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`resource_kind` text DEFAULT 'Not sure' NOT NULL,
	`why_useful` text NOT NULL,
	`submitter_role` text DEFAULT '' NOT NULL,
	`submitter_email` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_resource_suggestions_status_created_at` ON `resource_suggestions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_resource_suggestions_normalized_url` ON `resource_suggestions` (`normalized_url`);