import { CACHE_MANAGER, INestApplication } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import * as request from 'supertest';
import { ITEMS_PER_PAGE } from 'src/constants';
import { Cache } from 'cache-manager';

jest.setTimeout(30 * 1_000);

describe('User Controller E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheManager: Cache;

  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;
  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const createUser = async (
    firstName: string,
    email: string,
    hashedPassword: string,
    role: Role = Role.USER,
  ) =>
    await prisma.user.create({
      data: { firstName, email, hashedPassword, role },
    });
  const getToken = async (email: string, password: string) => {
    return (
      await request(app.getHttpServer())
        .post('/auth/signin')
        .set('Content-type', 'application/json')
        .send({ email, password: password })
    ).body.data.accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    user = await createUser('Jão', 'user@example.com', hashedPassword);
    admin = await createUser('Sigma', 'admin@example.com', hashedPassword, Role.ADMIN);

    userToken = await getToken(user.email, password);
    adminToken = await getToken(admin.email, password);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
    await cacheManager.reset();
  });

  describe('Private Routes (as User)', () => {
    it('Should Not Create an User', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .send({
          email: 'another.user@example.com',
          password,
        })
        .expect(403);
    });

    it('Should Not Return an User List', async () => {
      await request(app.getHttpServer())
        .get('/user')
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Return User', async () => {
      const user = await createUser('Jão', 'another.user@example.com', hashedPassword);
      await request(app.getHttpServer())
        .get(`/user/${user.id}`)
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Update User', async () => {
      const user = await createUser('Jão', 'another.user@example.com', hashedPassword);
      await request(app.getHttpServer())
        .put(`/user/${user.id}`)
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .send({ firstName: 'João' })
        .expect(403);
    });

    it('Should Not Remove User', async () => {
      const user = await createUser('Jão', 'another.user@example.com', hashedPassword);
      await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Return Own User', async () => {
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const userToken = await getToken(user.email, password);

      const response = await request(app.getHttpServer())
        .get('/user/me')
        .set('Content-type', 'application/json')
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
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const userToken = await getToken(user.email, password);

      const response = await request(app.getHttpServer())
        .put('/user/me')
        .set('Content-type', 'application/json')
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

      const newHashedPassword = (await prisma.user.findUnique({ where: { email: user.email } })).hashedPassword;
      expect(user.hashedPassword).not.toBe(newHashedPassword);
    });

    it('Should Remove Own User', async () => {
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const userToken = await getToken(user.email, password);

      const response = await request(app.getHttpServer())
        .delete('/user/me')
        .set('Content-type', 'application/json')
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
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      await prisma.user.delete({ where: { email: user.email } });

      await request(app.getHttpServer())
        .put('/user/restore')
        .send({
          ids: [user.id]
        })
        .set('Content-type', 'application/json')
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
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      await prisma.user.delete({ where: { email: user.email } });

      await request(app.getHttpServer())
        .delete('/user/hard-remove')
        .send({
          ids: [user.id]
        })
        .set('Content-type', 'application/json')
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

  describe('Private Routes (as Admin)', () => {
    it('Should Create an User', async () => {
      const response = await request(app.getHttpServer())
        .post('/user')
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .send({
          firstName: 'Jão',
          email: 'user@example.com',
          password,
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
          } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/user')
        .set('Content-type', 'application/json')
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
          } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/user')
        .query({ itemsPerPage: randomNUsers })
        .set('Content-type', 'application/json')
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

    it('Should Return User', async () => {
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const response = await request(app.getHttpServer())
        .get(`/user/${user.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Update User', async () => {
      const firstName = 'Jack';
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const response = await request(app.getHttpServer())
        .put(`/user/${user.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .send({ firstName })
        .expect(200);

      expect(response.body.data.firstName).toBe(firstName);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Remove User', async () => {
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      const response = await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Content-Type', 'application/json')
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
      const admin = await createUser('Sigma', 'admin@example.com', hashedPassword, Role.ADMIN);
      const adminToken = await getToken(admin.email, password);
      const response = await request(app.getHttpServer())
        .get('/user/me')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Update Own User', async () => {
      const firstName = 'Brabo';
      const admin = await createUser('Sigma', 'admin@example.com', hashedPassword, Role.ADMIN);
      const adminToken = await getToken(admin.email, password);
      const response = await request(app.getHttpServer())
        .put('/user/me')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .send({ firstName })
        .expect(200);

      expect(response.body.data.firstName).toBe(firstName);
      expect(response.body.data.hashedPassword).toBeUndefined();
      expect(response.body.data.hashedRefreshToken).toBeUndefined();
      expect(response.body.data.deleted).toBeUndefined();
    });

    it('Should Remove Own User', async () => {
      const admin = await createUser('Sigma', 'admin@example.com', hashedPassword, Role.ADMIN);
      const adminToken = await getToken(admin.email, password);
      const response = await request(app.getHttpServer())
        .delete('/user/me')
        .set('Content-Type', 'application/json')
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
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .put(`/user/restore`)
        .send({ ids: [user.id] })
        .set('Content-type', 'application/json')
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
      const user = await createUser('Jão', 'user@example.com', hashedPassword);
      await request(app.getHttpServer())
        .delete(`/user/${user.id}`)
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete('/user/hard-remove')
        .send({ ids: [user.id] })
        .set('Content-type', 'application/json')
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
