# Audit logging and transaction contract

## Existing mutation surfaces reviewed

- `src/modules/student/student.controller.ts` and `student.service.ts`: create, update, single delete, bulk delete.
- `src/modules/admin/admin.controller.ts` and `admin.service.ts`: account create/update/status/deactivation and permission changes.
- `src/modules/student_documents/student-documents.controller.ts` and `student-documents.service.ts`: upload/overwrite, soft-delete-to-trash, restore, permanent delete, empty trash, and file download.
- `src/modules/student_documents/student-trash.controller.ts`: trash listing, restore, and permanent deletion.
- `src/modules/directory/directory.controller.ts`, `directory.service.ts`, and `directory.gateway.ts`: directory snapshots and filesystem watcher events. Watcher events are not authenticated user actions and must not be attributed to a user unless the initiating operation is correlated.
- `src/modules/audit_logs/`: existing audit-log read and manual-write API.

## Transaction rule

For a database mutation, use the same Prisma interactive transaction client for both the business writes and the audit writes. Use `AuditLogsService.createActivityLogInTransaction(tx, ...)` and/or `createFileModificationLogInTransaction(tx, ...)` inside the callback passed to `prisma.$transaction`. Do not call the standalone methods from inside an existing transaction: they intentionally open their own transaction and would not roll back with the business operation.

Example:

```ts
return this.prisma.$transaction(async (tx) => {
  const updated = await tx.student.update({ where: { studentUuid }, data });
  await this.auditLogs.createActivityLogInTransaction(
    tx,
    { userAccId, roleId, action: 'student.update' },
    actorDisplayName,
    JSON.stringify({ studentUuid }),
  );
  return updated;
});
```

A failed business write or failed audit insert rejects the callback and rolls back both database changes.

## Current schema compatibility

The deployed Prisma schema uses `ActivityLog` fields `userAccId`, `roleId`, `adminName`, `action`, `description`, `createdAt`, and `FileModificationLog` fields `userAccId`, `roleId`, `adminName`, `studentName`, `fileAction`, `fileModified`, `fileLoc`, `createdAt`. To avoid an uncoordinated destructive schema change, the transaction-aware writers retain these fields. The file writer can encode `oldState` and `newState` as JSON in `fileModified`.

## Important integration requirements

The current JWT strategy exposes `sub` (user ID), while the audit tables require the composite account/role pair `userAccId` + `roleId`. A mutation handler must resolve that pair from the authenticated account and active role; do not trust actor IDs supplied in request bodies. File operations also touch the filesystem, which MariaDB transactions cannot roll back. Keep the existing compensating rename logic and only record a completed operation after the filesystem operation succeeds; if database logging fails after a filesystem mutation, compensate the filesystem change before rethrowing.

The new transaction-aware methods establish the safe write primitive, but each mutation route must pass its authenticated actor and call that primitive in its own business transaction before it can be considered fully instrumented. Avoid logging passwords, refresh tokens, document contents, or other sensitive payloads.
