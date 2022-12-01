import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { MESSAGE } from 'src/constants';
import { IS_PUBLIC_KEY } from 'src/utils';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const IS_PUBLIC = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (IS_PUBLIC) {
      super.canActivate(context);
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const IS_PUBLIC = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!IS_PUBLIC && (err || !user)) {
      throw (
        err ||
        new UnauthorizedException({
          message: MESSAGE.EXCEPTION.NOT_AUTHORIZED,
          data: {},
        })
      );
    }
    return user;
  }
}
