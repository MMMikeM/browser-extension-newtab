CREATE TABLE `categories` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sort_order` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `fk_categories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`task_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `fk_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_notes_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY,
	`endpoint` text NOT NULL UNIQUE,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `fk_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `task_shares` (
	`id` text PRIMARY KEY,
	`task_id` text NOT NULL,
	`shared_with_user_id` text NOT NULL,
	`permission` text DEFAULT 'edit' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `fk_task_shares_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_shares_shared_with_user_id_users_id_fk` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`category_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text,
	`sort_order` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT `fk_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_tasks_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`username` text NOT NULL UNIQUE,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
