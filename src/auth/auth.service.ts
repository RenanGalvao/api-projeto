import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { TokenService } from 'src/token/token.service';
import { NewPasswordDto, SendRecoverEmailDto } from 'src/mail/dto';
import { User } from '@prisma/client';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private tokenService: TokenService,
    private prismaService: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.userService.findByEmailAuth(email);
    if (user && bcrypt.compareSync(pass, user.hashedPassword)) {
      this.userService.updateLastAccess(user.id);

      delete user.hashedPassword;
      return user;
    }
    return null;
  }

  async signin(user: User) {
    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.updateRefreshTokenHash(user, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        lastAccess: user.lastAccess,
      },
    };
  }

  async sendRecoverEmail(sendRecoverEmailDto: SendRecoverEmailDto) {
    return await this.mailService.sendRecoverEmail(sendRecoverEmailDto);
  }

  async confirmRecoverEmail(newPassword: NewPasswordDto) {
    const removeHyphens = (token: string) => token.split('-').join('');
    const isTokenValid = await this.tokenService.validate(
      newPassword.email,
      removeHyphens(newPassword.token),
    );

    if (isTokenValid) {
      await this.userService.updatePasswordByEmail(newPassword.email, newPassword.password);
      return true;
    } else {
      throw new BadRequestException({
        message: MESSAGE.EXCEPTION.INVALID_TOKEN,
        data: {},
      });
    }
  }

  async tokenValidate(email: string, token: string) {
    const tokenDoc = await this.prismaService.token.findFirst({
      where: {
        email,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (tokenDoc == null) {
      throw new NotFoundException({
        message: MESSAGE.EXCEPTION.TOKEN_NOT_SET,
        data: {},
      });
    }
    const isTokenValid = this.tokenService.isTokenValid(tokenDoc, token);
    return isTokenValid;
  }

  async refresh(user: User, refreshToken: string) {
    const userInDB = await this.prismaService.user.findUnique({
      where: { id: user.id },
    });
    if (!userInDB || !userInDB.hashedRefreshToken) {
      throw new ForbiddenException({
        message: MESSAGE.EXCEPTION.FORBIDDEN,
        data: {},
      });
    }

    const isValid = bcrypt.compareSync(refreshToken, userInDB.hashedRefreshToken);
    if (isValid) {
      const tokens = await this.generateTokens(userInDB);
      await this.updateRefreshTokenHash(userInDB, tokens.refreshToken);

      return tokens;
    } else {
      throw new ForbiddenException({
        message: MESSAGE.EXCEPTION.FORBIDDEN,
        data: {},
      });
    }
  }

  async updateRefreshTokenHash(user: User, refreshToken: string) {
    const hashedRefreshToken = bcrypt.hashSync(refreshToken, bcrypt.genSaltSync());
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });
  }

  async generateTokens(user: User) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(user, {
        secret: this.configService.get('jwt.accessToken.secret'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(user, {
        secret: this.configService.get('jwt.refreshToken.secret'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }

  async logout(user: User) {
    try {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });
      return true;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }
}
