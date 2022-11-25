import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role, User } from '@prisma/client';
import { MESSAGE } from 'src/constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.hasAccessLevel(context)) {
      throw new ForbiddenException({
        message: MESSAGE.EXCEPTION.FORBIDDEN,
        data: {},
      });
    }
    return true;
  }

  private hasAccessLevel(context: ExecutionContext) {
    const { user }: { user: User } = context.switchToHttp().getRequest();
    const ROLES = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!ROLES || user.role == 'ADMIN') {
      return true;
    }
    return ROLES.some(role => user.role == role);
  }
}
