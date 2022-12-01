import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import configuration from 'src/config/configuration';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';
import { TokenType, User } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { JwtService } from '@nestjs/jwt';

describe('Auth Service Integration', () => {
  let prisma: PrismaService;
  let authService: AuthService;
  let userService: UserService;
  let tokenService: TokenService;
  let mailService: MailService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const firstName = 'João';
  const email = 'joao@example.com';
  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
  const createUser = async (
    firstName: string,
    email: string,
    hashedPassword: string,
    hashedRefreshToken: string = null,
  ) =>
    await prisma.user.create({
      data: { firstName, email, hashedPassword, hashedRefreshToken },
    });
  const generateRefreshToken = async (user: User) => {
    const refreshToken = jwtService.sign(user, {
      secret: configService.get('jwt.refreshToken.secret'),
      expiresIn: '7d',
    });
    const hashedRefreshToken = bcrypt.hashSync(
      refreshToken,
      bcrypt.genSaltSync(),
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });
    return refreshToken;
  };

  beforeAll(async () => {
    const mailAccount = await nodemailer.createTestAccount();
    const moduleRef = await Test.createTestingModule({
      imports: [
        // look at configuration.ts
        ConfigModule.forRoot({
          load: [
            () => ({
              ...configuration(),
              mailer: {
                ...configuration().mailer,
                transport: {
                  host: mailAccount.smtp.host,
                  secure: mailAccount.smtp.secure,
                  port: mailAccount.smtp.port,
                  auth: {
                    user: mailAccount.user,
                    pass: mailAccount.pass,
                  },
                },
              },
            }),
          ],
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    authService = moduleRef.get(AuthService);
    tokenService = moduleRef.get(TokenService);
    jwtService = moduleRef.get(JwtService);
    configService = moduleRef.get(ConfigService);
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
  });

  describe('validateUser()', () => {
    it("Should Not Validate (User Doesn't Exists)", async () => {
      const isValid = await authService.validateUser(
        'null@example.com',
        'shinepass',
      );
      expect(isValid).toBeNull();
    });

    it('Should Not Validate (Wrong Password)', async () => {
      await createUser(firstName, email, hashedPassword);

      const isValid = await authService.validateUser(email, 'wrongpass');
      expect(isValid).toBeNull();
    });

    it('Should Validate', async () => {
      await createUser(firstName, email, hashedPassword);

      const isValid = await authService.validateUser(email, password);
      expect(isValid).toBeDefined();
    });
  });

  describe('signin()', () => {
    it('Should Return Tokens and User Data', async () => {
      const user = await createUser(firstName, email, hashedPassword);
      const data = await authService.signin(user);

      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user).toBeDefined();
    });
  });

  describe('confirmRecoverEmail()', () => {
    it("Should Not Validate (Token Doesn't Exists)", async () => {
      try {
        await authService.confirmRecoverEmail({
          email,
          password,
          token: 'ZDDZ42',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
      }
    });

    it('Should Not Validate (Used Token)', async () => {
      try {
        await prisma.token.create({
          data: {
            email,
            token: 'notrealhash',
            tokenType: TokenType.RECOVER_EMAIL,
            used: true,
          },
        });
        await authService.confirmRecoverEmail({
          email,
          password,
          token: 'ZDDZ42',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
      }
    });

    it('Should Not Validate (Invalid Token)', async () => {
      try {
        await tokenService.create({
          email,
          token_type: TokenType.RECOVER_EMAIL,
        });
        await authService.confirmRecoverEmail({
          email,
          password,
          token: 'NOTVALID',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.INVALID_TOKEN);
      }
    });

    it('Should Validate', async () => {
      await createUser(firstName, email, hashedPassword);
      const tokenString = 'PNTKTR';
      await prisma.token.create({
        data: {
          email,
          token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
          tokenType: TokenType.RECOVER_EMAIL,
        },
      });
      const isValid = await authService.confirmRecoverEmail({
        email,
        password,
        token: tokenString,
      });

      expect(isValid).toBe(true);
    });
  });

  describe('tokenValidate()', () => {
    it('Should Not Validate Token (Not Set)', async () => {
      try {
        await authService.tokenValidate('email@example', 'AAAAAA');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
      }
    });

    it('Should Not Validate Token (Wrong Token)', async () => {
      const email = 'email@example.com';
      const tokenString = 'AAAAAA';
      await prisma.token.create({
        data: {
          email,
          tokenType: TokenType.RECOVER_EMAIL,
          token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
        },
      });

      const isValid = await authService.tokenValidate(email, 'WRONG1');
      expect(isValid).toBe(false);
    });

    it('Should Validate Token', async () => {
      const email = 'email@example.com';
      const tokenString = 'AAAAAA';
      await prisma.token.create({
        data: {
          email,
          tokenType: TokenType.RECOVER_EMAIL,
          token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
        },
      });

      const isValid = await authService.tokenValidate(email, tokenString);
      expect(isValid).toBe(true);
    });
  });

  describe('refresh()', () => {
    it("Should Not Return Refresh Tokens (User Doesn't Exists)", async () => {
      try {
        const user = await createUser(firstName, email, hashedPassword);
        await prisma.user.delete({ where: { id: user.id } });

        await authService.refresh(user, 'refreshtoken');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Not Return Refresh Tokens (No hashedRefreshToken in DB)', async () => {
      try {
        const user = await createUser(firstName, email, hashedPassword);
        const hashedRefreshToken = await generateRefreshToken(user);
        await prisma.user.update({
          where: { id: user.id },
          data: { hashedRefreshToken: null },
        });

        await authService.refresh(user, hashedRefreshToken);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Not Return Refresh Tokens (Invalid RefreshToken)', async () => {
      try {
        const user = await createUser(firstName, email, hashedPassword);
        const hashedRefreshToken = await generateRefreshToken(user);
        await prisma.user.update({
          where: { id: user.id },
          data: { hashedRefreshToken },
        });

        await authService.refresh(user, 'invalidrefreshtoken');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Return Refresh Tokens', async () => {
      const user = await createUser(firstName, email, hashedPassword);
      const refreshToken = await generateRefreshToken(user);

      const tokens = await authService.refresh(user, refreshToken);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('logout()', () => {
    it("Should Not Logout (User Doesn't Exists)", async () => {
      const user = await createUser(firstName, email, hashedPassword);
      await prisma.user.delete({ where: { id: user.id } });
      try {
        await authService.logout(user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
        );
      }
    });

    it('Should Logout', async () => {
      const user = await createUser(firstName, email, hashedPassword);
      await authService.logout(user);

      const isUserRemoved = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(isUserRemoved.hashedRefreshToken).toBeNull();
    });
  });
});
