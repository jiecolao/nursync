-- Audit logs retain the actor and role values as an immutable snapshot.
-- They must not prevent user-account or role lifecycle operations.
ALTER TABLE `File_modification_logs`
  DROP FOREIGN KEY `File_modification_logs_user_acc_id_role_id_fkey`;

ALTER TABLE `Activity_logs`
  DROP FOREIGN KEY `Activity_logs_user_acc_id_role_id_fkey`;
