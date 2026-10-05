-- CreateTable
CREATE TABLE `Users` (
    `user_id` VARCHAR(64) NOT NULL,
    `faculty_id` VARCHAR(20) NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `fast_name` VARCHAR(255) NOT NULL,
    `middle_name` VARCHAR(255) NULL,
    `suffix` VARCHAR(5) NULL,
    `gender_id` INTEGER NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_faculty_id_key`(`faculty_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_accounts` (
    `user_acc_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `hashed_pass` VARCHAR(255) NOT NULL,
    `hashed_refresh_token` TEXT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_accounts_user_id_key`(`user_id`),
    UNIQUE INDEX `User_accounts_username_key`(`username`),
    PRIMARY KEY (`user_acc_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_account_roles` (
    `user_acc_id` VARCHAR(36) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_account_roles_user_acc_id_key`(`user_acc_id`),
    PRIMARY KEY (`user_acc_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(50) NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Roles_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permissions` (
    `permission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `students_read` BOOLEAN NOT NULL,
    `students_write` BOOLEAN NOT NULL,
    `user_read` BOOLEAN NOT NULL,
    `user_write` BOOLEAN NOT NULL,
    `logs_read` BOOLEAN NOT NULL,
    `logs_write` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audit_logs` (
    `audit_uuid` VARCHAR(36) NOT NULL,
    `user_acc_id` VARCHAR(36) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `action` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`audit_uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Students` (
    `student_uuid` VARCHAR(36) NOT NULL,
    `student_id` VARCHAR(20) NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `middle_name` VARCHAR(255) NULL,
    `genderId` INTEGER NULL,
    `dob` DATETIME(3) NULL,
    `contact_no` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `provincial_addr` TEXT NULL,
    `city_addr` TEXT NULL,
    `yr_admitted` INTEGER NOT NULL,
    `yr_residency` INTEGER NOT NULL,
    `yr_graduated` INTEGER NULL,
    `is_HD` BOOLEAN NOT NULL DEFAULT false,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Students_student_id_key`(`student_id`),
    PRIMARY KEY (`student_uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student_Documents` (
    `student_doc_id` VARCHAR(64) NOT NULL,
    `student_uuid` VARCHAR(255) NOT NULL,
    `docu_id` INTEGER NOT NULL,
    `filename` VARCHAR(255) NULL,
    `filepath` VARCHAR(255) NULL,
    `submitted_at` DATETIME(3) NULL,
    `docu_status_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`student_doc_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document_categories` (
    `docu_id` INTEGER NOT NULL,
    `docu_name` VARCHAR(20) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Document_categories_docu_name_key`(`docu_name`),
    PRIMARY KEY (`docu_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document_Status` (
    `docu_status_id` INTEGER NOT NULL,
    `docu_status_name` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`docu_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Genders` (
    `gender_id` INTEGER NOT NULL,
    `gender_name` VARCHAR(20) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`gender_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Users` ADD CONSTRAINT `Users_gender_id_fkey` FOREIGN KEY (`gender_id`) REFERENCES `Genders`(`gender_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_accounts` ADD CONSTRAINT `User_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_account_roles` ADD CONSTRAINT `User_account_roles_user_acc_id_fkey` FOREIGN KEY (`user_acc_id`) REFERENCES `User_accounts`(`user_acc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_account_roles` ADD CONSTRAINT `User_account_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `Roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Roles` ADD CONSTRAINT `Roles_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permissions`(`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Audit_logs` ADD CONSTRAINT `Audit_logs_user_acc_id_role_id_fkey` FOREIGN KEY (`user_acc_id`, `role_id`) REFERENCES `User_account_roles`(`user_acc_id`, `role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Students` ADD CONSTRAINT `Students_genderId_fkey` FOREIGN KEY (`genderId`) REFERENCES `Genders`(`gender_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student_Documents` ADD CONSTRAINT `Student_Documents_student_uuid_fkey` FOREIGN KEY (`student_uuid`) REFERENCES `Students`(`student_uuid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student_Documents` ADD CONSTRAINT `Student_Documents_docu_id_fkey` FOREIGN KEY (`docu_id`) REFERENCES `Document_categories`(`docu_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student_Documents` ADD CONSTRAINT `Student_Documents_docu_status_id_fkey` FOREIGN KEY (`docu_status_id`) REFERENCES `Document_Status`(`docu_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
