-- CreateIndex
CREATE INDEX `comments_path_depth_idx` ON `comments`(`path`, `depth`);

-- CreateIndex
CREATE INDEX `sender_receiver_created_idx` ON `direct_messages`(`sender_id`, `receiver_id`, `created_at`);

-- CreateIndex
CREATE INDEX `users_email_verified_idx` ON `users`(`email_verified`);
