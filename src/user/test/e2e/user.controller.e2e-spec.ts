import { CACHE_MANAGER } from '@nestjs/common';
import { Field, Role, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import * as request from 'supertest';
import { ITEMS_PER_PAGE } from 'src/constants';
import { Cache } from 'cache-manager';
import {
  createField,
  createUser,
  getToken,
  setAppConfig,
} from 'src/utils/test';
import { NestExpressApplication } from '@nestjs/platform-express';

jest.setTimeout(30 * 1_000);

describe('User Controller E2E', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cacheManager: Cache;

  let field: Field;
  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const firstName = 'João';
  const email = 'joao@email.com';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setAppConfig(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    field = await createField(
      prisma,
      'América',
      'Brasil',
      'Rio de Janeiro',
      'AMEBRRJ01',
      'Designação',
    );

    user = await createUser(
      prisma,
      'João',
      'user@example.com',
      hashedPassword,
      Role.VOLUNTEER,
      field.id,
    );
    userToken = await getToken(app, user.email, password);

    admin = await createUser(
      prisma,
      'Sigma',
      'admin@example.com',
      hashedPassword,
      Role.ADMIN,
    );
    adminToken = await getToken(app, admin.email, password);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
    await cacheManager.reset();

    field = await createField(
      prisma,
      'América',
      'Brasil',
      'Rio de Janeiro',
      'AMEBRRJ01',
      'Designação',
    );
  });

  describe('Private Routes (as User)', () => {
    it('Should Not Create an User', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `bearer ${userToken}`)
        .send({
          firstName,
          email,
          password,
          field: field.id,
        })
        .expect(403);
    });

    it('Should Not Return an User List', async () => {
      await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Return an User', async () => {
      await request(app.getHttpServer())
        .get(`/user/${user.id}`)
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Update User', async () => {
      await request(app.getHttpServer())
        .put(`/user/${user.id}`)
        .set('Authorization', `bearer ${userToken}`)
        .send({ firstName: 'João' })
        .expect(403);
    });

    it('Should Not Remove User', async () => {
      await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Return Own User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      const userToken = await getToken(app, user.email, password);

      const response = await request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', `bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Update Own User', async () => {
      const newName = 'João';
      const newPassword = 'anotherone';
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      const userToken = await getToken(app, user.email, password);

      const response = await request(app.getHttpServer())
        .put('/user/me')
        .set('Authorization', `bearer ${userToken}`)
        .send({
          firstName: newName,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.data.firstName).toBe(newName);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();

      const newHashedPassword = (
        await prisma.user.findUnique({ where: { email: user.email } })
      ).hashedPassword;
      expect(user.hashedPassword).not.toBe(newHashedPassword);
    });

    it('Should Remove Own User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      const userToken = await getToken(app, user.email, password);

      const response = await request(app.getHttpServer())
        .delete('/user/me')
        .set('Authorization', `bearer ${userToken}`)
        .expect(200);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();

      const isUserDeleted = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { lte: new Date() },
        },
      });
      expect(isUserDeleted).toBeDefined();
    });

    it('Should Not Restore User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      await prisma.user.delete({ where: { email: user.email } });

      await request(app.getHttpServer())
        .put('/user/restore')
        .send({
          ids: [user.id],
        })
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isUserIntact = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { not: new Date() },
        },
      });
      expect(isUserIntact.deleted).not.toBeNull();
    });

    it('Should Not Hard Remove Work', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      await prisma.user.delete({ where: { email: user.email } });

      await request(app.getHttpServer())
        .delete('/user/hard-remove')
        .send({
          ids: [user.id],
        })
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isUserRemoved = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { not: new Date() },
        },
      });
      expect(isUserRemoved.deleted).not.toBeNull();
    });
  });

  describe('Private Routes (as ADMIN)', () => {
    it('Should Create an User', async () => {
      const response = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `bearer ${adminToken}`)
        .send({
          firstName,
          email,
          password,
          field: field.id,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it(`Should Return an User List With ${ITEMS_PER_PAGE} Items`, async () => {
      const usersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              email: `user${i}@example.com`,
              hashedPassword,
              fieldId: field.id,
            } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.body.data[0].hashedPassword).toBeUndefined();
      expect(response.body.data[0].hashedRefreshToken).toBeUndefined();
      expect(response.body.data[0].deleted).toBeNull();
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomNUsers = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an User List With ${randomNUsers} Items`, async () => {
      const usersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              email: `user${i}@example.com`,
              hashedPassword,
              fieldId: field.id,
            } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/user')
        .query({ itemsPerPage: randomNUsers })

        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(randomNUsers);
      expect(response.body.data[0].hashedPassword).toBeUndefined();
      expect(response.body.data[0].hashedRefreshToken).toBeUndefined();
      expect(response.body.data[0].deleted).toBeNull();
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(
        String(Math.ceil(+response.headers['x-total-count'] / randomNUsers)),
      );
    });

    it('Should Return an User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      const response = await request(app.getHttpServer())
        .get(`/user/${user.id}`)

        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Update an User', async () => {
      const newFirstName = 'Jack';
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );

      const response = await request(app.getHttpServer())
        .put(`/user/${user.id}`)
        .set('Authorization', `bearer ${adminToken}`)
        .send({ firstName: newFirstName, field: user.fieldId })
        .expect(200);

      expect(response.body.data.firstName).toBe(newFirstName);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Remove an User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      const response = await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();

      const isUserDeleted = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { lte: new Date() },
        },
      });
      expect(isUserDeleted).toBeDefined();
    });

    it('Should Return Own User', async () => {
      const admin = await createUser(
        prisma,
        'Sigma',
        'admin@example.com',
        hashedPassword,
        Role.ADMIN,
      );
      const adminToken = await getToken(app, admin.email, password);
      const response = await request(app.getHttpServer())
        .get('/user/me')

        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Update Own User', async () => {
      const newFirstName = 'Brabo';
      const admin = await createUser(
        prisma,
        'Sigma',
        'admin@example.com',
        hashedPassword,
        Role.ADMIN,
      );
      const adminToken = await getToken(app, admin.email, password);
      const response = await request(app.getHttpServer())
        .put('/user/me')
        .set('Authorization', `bearer ${adminToken}`)
        .send({ firstName: newFirstName })
        .expect(200);

      expect(response.body.data.firstName).toBe(newFirstName);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Remove Own User', async () => {
      const admin = await createUser(
        prisma,
        'Sigma',
        'admin@example.com',
        hashedPassword,
        Role.ADMIN,
      );
      const adminToken = await getToken(app, admin.email, password);
      const response = await request(app.getHttpServer())
        .delete('/user/me')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();

      const isUserDeleted = await prisma.user.findFirst({
        where: {
          email: admin.email,
          deleted: { lte: new Date() },
        },
      });
      expect(isUserDeleted).toBeDefined();
    });

    it('Should Restore User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      await prisma.user.delete({ where: { id: user.id } });

      await request(app.getHttpServer())
        .put(`/user/restore`)
        .send({ ids: [user.id] })
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isUserRestored = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: null,
        },
      });
      expect(isUserRestored.deleted).toBeNull();
    });

    it('Should Hard Remove User', async () => {
      const user = await createUser(
        prisma,
        firstName,
        email,
        hashedPassword,
        Role.VOLUNTEER,
        field.id,
      );
      await prisma.user.delete({ where: { id: user.id } });

      await request(app.getHttpServer())
        .delete('/user/hard-remove')
        .send({ ids: [user.id] })
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isUserRemoved = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { not: new Date() },
        },
      });
      expect(isUserRemoved).toBeNull();
    });
  });
});
