import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';
import { MESSAGE } from 'src/constants';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.REFRESH_TOKEN_JWT_SECRET,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: User) {
    const refreshToken = req
      ?.get('authorization')
      ?.replace(/bearer/i, '')
      .trim();

    if (refreshToken) {
      return {
        ...payload,
        refreshToken,
      };
    } else {
      throw new ForbiddenException({
        message: MESSAGE.EXCEPTION.FORBIDDEN,
        data: {},
      });
    }
  }
}
