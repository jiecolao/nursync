# Audit logging and transaction contract

## Implemented coverage

- Authentication: successful login, token refresh, logout, and password reset are recorded with the authenticated account and role. Credentials, tokens, and password values are never written to audit descriptions.
- Student routes: create, update, single deactivate, and bulk deactivate are logged in the same Prisma transaction as the database mutation. Student deletion is implemented as deactivation so document files and metadata are not orphaned.
- Admin services: account creation, profile/permission changes, password changes, status changes, and deactivation use transactional audit inserts. Controllers pass the verified JWT subject, not actor identity from request bodies.
- Student document routes: upload/overwrite, move to trash, restore, permanent delete, and empty trash write file-modification and activity records within the database transaction.
- Trash routes require JWT authentication and pass the authenticated subject to the service.
- Filesystem watcher events are asynchronous external changes and have no authenticated actor. They are not falsely attributed to a user; watcher errors are logged by the service.

## Transaction and filesystem safety

For database-only mutations, the business change and audit insert share the same Prisma interactive transaction. If the business operation or audit insert fails, the database rolls back both.

File operations use compensation because a MariaDB transaction cannot roll back filesystem changes:

- Uploads stage new contents in a unique temporary directory, back up overwritten files, perform database writes and audit inserts in one transaction, and restore prior files/remove newly installed files if the transaction fails.
- Move-to-trash and restore operations rename files first, then update metadata and write both logs in a database transaction. On transaction failure, the file is renamed back.
- Permanent deletion and empty-trash operations first move files to temporary names, delete metadata and write logs in a database transaction, then remove staged files after commit. On transaction failure, staged files are restored.

A process crash or storage failure during filesystem compensation cannot be made fully atomic with a relational database. Temporary upload/deletion artifacts should be included in operational recovery and monitoring.

## Schema compatibility

The current Prisma schema uses ActivityLog fields userAccId, roleId, adminName, action, description, and createdAt, and FileModificationLog fields userAccId, roleId, adminName, studentName, fileAction, fileModified, fileLoc, and createdAt. The transaction-aware writers retain this deployed schema. File state is JSON-encoded in fileModified.

The authenticated JWT subject is the account ID (userAccId); actor resolution looks up that account and its active role through the transaction client. Actor IDs are not accepted from request bodies.

## Operational note

Automated tests were intentionally not run per task instruction. A build/type-check and deployment verification remain recommended before release.
