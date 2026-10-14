CREATE TABLE `crane_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`evaluator` text NOT NULL,
	`scenario_id` text NOT NULL,
	`scenario_title` text NOT NULL,
	`category` text NOT NULL,
	`load_lb` integer NOT NULL,
	`horizontal_ft` integer NOT NULL,
	`vertical_ft` integer NOT NULL,
	`selected_crane` text NOT NULL,
	`baseline_crane` text NOT NULL,
	`confidence` text NOT NULL,
	`reasons` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL
);
