import { SetMetadata } from '@nestjs/common';
export const REQUIRED_PERMISSIONS = 'required_permissions';
export type PermissionKey = 'students_read' | 'students_write' | 'user_read' | 'user_write' | 'logs_read' | 'logs_write';
export const RequirePermissions = (...permissions: PermissionKey[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
export const REQUIRED_ROLES = 'required_roles';
export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES, roles);
