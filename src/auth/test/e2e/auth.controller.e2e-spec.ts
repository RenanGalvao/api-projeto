import { CACHE_MANAGER } from '@nestjs/common';
import { Role, TokenType, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import * as nodemailer from 'nodemailer';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { TokenService } from 'src/token/token.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { createUser, getToken, setAppConfig } from 'src/utils/test';
import { NestExpressApplication } from '@nestjs/platform-express';

jest.setTimeout(30 * 1_000);

describe('Auth Controller E2E', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  let cacheManager: Cache;

  let user: User;
  const firstName = 'João';
  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
  const baseRoute = '/auth';

  beforeAll(async () => {
    const mailAccount = await nodemailer.createTestAccount();
    const moduleRef = await Test.createTestingModule({
      imports: [
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

    app = moduleRef.createNestApplication();
    setAppConfig(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
    tokenService = moduleRef.get(TokenService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    user = await createUser(
      prisma,
      firstName,
      'user@example.com',
      hashedPassword,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
    await cacheManager.reset();
  });

  describe('Public Routes', () => {
    it('Should Not Signin (Wrong Credentials)', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      await request(app.getHttpServer())
        .post(`${baseRoute}/signin`)
        .set('Content-Type', 'application/json')
        .send({ email, password: 'wrongpass' })
        .expect(401);
    });

    it('Should Signin', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/signin`)
        .set('Content-Type', 'application/json')
        .send({ email, password })
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user.hashedRefreshToken).toBeDefined();
    });

    it('Should Send Recover Email', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      await request(app.getHttpServer())
        .post(`${baseRoute}/recover-email`)
        .set('Content-Type', 'application/json')
        .send({ email })
        .expect(201);
    });

    it('Should Not Send Recover Email (Wrong Email)', async () => {
      const email = 'joao@example.com';
      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/recover-email`)
        .set('Content-Type', 'application/json')
        .send({ email })
        .expect(404);

      expect(response.body.message).toBe(
        TEMPLATE.EXCEPTION.NOT_FOUND('e-mail', 'o'),
      );
    });

    it('Should Not Set New Password (Not Solicited Token)', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/recover-email/confirm`)
        .set('Content-Type', 'application/json')
        .send({ email, token: 'WRONG1', password: 'newpassword' })
        .expect(404);

      expect(response.body.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
    });

    it('Should Not Set New Password (Wrong Token)', async () => {
      const email = 'joao@example.com';
      const user = await createUser(prisma, firstName, email, hashedPassword);
      await tokenService.create({
        email: user.email,
        token_type: TokenType.RECOVER_EMAIL,
      });

      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/recover-email/confirm`)
        .set('Content-Type', 'application/json')
        .send({ email, token: 'WRONG1', password: 'newpassword' })
        .expect(400);

      expect(response.body.message).toBe(MESSAGE.EXCEPTION.INVALID_TOKEN);
    });

    it('Should Set New Password', async () => {
      const email = 'joao@example.com';
      const user = await createUser(prisma, firstName, email, hashedPassword);
      const token = await tokenService.create({
        email: user.email,
        token_type: TokenType.RECOVER_EMAIL,
      });

      await request(app.getHttpServer())
        .post(`${baseRoute}/recover-email/confirm`)
        .set('Content-Type', 'application/json')
        .send({ email, token, password: 'newpassword' })
        .expect(201);
    });

    it('Should Not Return New Tokens (Invalid Refresh Token)', async () => {
      await request(app.getHttpServer())
        .post(`${baseRoute}/refresh`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer invalidToken`)
        .expect(401);
    });

    it('Should Not Return New Tokens (No HashedRefreshToken in DB)', async () => {
      const email = 'joao@example.com';
      const user = await createUser(prisma, firstName, email, hashedPassword);
      const userToken = await getToken(app, email, password, true);

      await prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });

      await request(app.getHttpServer())
        .post(`${baseRoute}/refresh`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Return New Tokens', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      const userToken = await getToken(app, email, password, true);
      const userOld = await prisma.user.findUnique({
        where: { email },
      });

      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/refresh`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      const user = await prisma.user.findUnique({
        where: { email },
      });
      expect(user.hashedRefreshToken).toBeDefined();
      expect(user.hashedRefreshToken).not.toBe(userOld.hashedRefreshToken);
    });

    it('Should Not Logout (Invalid Token)', async () => {
      await request(app.getHttpServer())
        .post(`${baseRoute}/logout`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer invalidToken`)
        .expect(401);
    });

    it('Should Logout', async () => {
      const email = 'joao@example.com';
      const user = await createUser(prisma, firstName, email, hashedPassword);
      const userToken = await getToken(app, email, password);

      await request(app.getHttpServer())
        .post(`${baseRoute}/logout`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      const isLoggedOut = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(isLoggedOut.hashedRefreshToken).toBeNull();
    });

    it('Should Not Validate Token (Token Not Set)', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      const tokenString = 'AAAAAA';

      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/token-validate`)
        .set('Content-Type', 'application/json')
        .send({ email, token: tokenString })
        .expect(404);

      expect(response.body.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
    });

    it('Should Not Validate Token (Wrong Token)', async () => {
      const email = 'joao@example.com';
      await createUser(prisma, firstName, email, hashedPassword);
      const tokenString = 'AAAAAA';
      await prisma.token.create({
        data: {
          email,
          tokenType: TokenType.RECOVER_EMAIL,
          token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/token-validate`)
        .set('Content-Type', 'application/json')
        .send({ email, token: 'WRONG1' })
        .expect(201);

      expect(response.body.data).toBe(false);
    });

    it('Should Validate Token', async () => {
      const email = 'joao@example.com';
      const tokenString = 'AAAAAA';
      await prisma.token.create({
        data: {
          email,
          tokenType: TokenType.RECOVER_EMAIL,
          token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`${baseRoute}/token-validate`)
        .set('Content-Type', 'application/json')
        .send({ email, token: tokenString })
        .expect(201);

      expect(response.body.data).toBe(true);
    });
  });
});
