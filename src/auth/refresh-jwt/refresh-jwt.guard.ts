import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MESSAGE } from 'src/constants';

export class RefreshJwtAuthGuard extends AuthGuard('refresh-jwt') {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
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
