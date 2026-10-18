import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS, REQUIRED_ROLES, PermissionKey } from '../decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]) ?? [];
    const permissions = this.reflector.getAllAndOverride<PermissionKey[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    if (!roles.length && !permissions.length) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as { roles?: string[]; role?: string; permissions?: Record<string, boolean> } | undefined;
    if (!user) throw new ForbiddenException('Authentication required');
    const userRoles = user.roles ?? (user.role ? [user.role] : []);
    if (roles.length && !roles.some(role => userRoles.includes(role))) throw new ForbiddenException('Insufficient role');
    if (permissions.some(permission => user.permissions?.[permission] !== true)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
