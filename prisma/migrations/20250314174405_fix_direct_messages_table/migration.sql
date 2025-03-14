-- CreateIndex
CREATE INDEX `direct_messages_sender_id_receiver_id_idx` ON `direct_messages`(`sender_id`, `receiver_id`);

-- CreateIndex
CREATE INDEX `direct_messages_created_at_idx` ON `direct_messages`(`created_at`);
