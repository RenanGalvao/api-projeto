import { CACHE_MANAGER, INestApplication } from '@nestjs/common';
import { Log, Role, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE } from 'src/constants';

describe('Log Controller E2E', () => {
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
  const createLog = async (
    ip: string,
    method: string,
    url: string,
    statusCode: string,
    user: User = null,
  ) => {
    const userObj = !user ? undefined : { connect: { id: user.id } };
    return await prisma.log.create({
      data: { ip, method, url, statusCode, user: userObj },
    });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    user = await createUser('joão', 'user@example.com', hashedPassword);
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
    it('Should Not Return a Log List', async () => {
      await request(app.getHttpServer())
        .get('/log')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Return a Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/user', '401');
      await request(app.getHttpServer())
        .get(`/log/${log.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Restore Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/user', '401');
      await prisma.log.delete({ where: { id: log.id } });

      await request(app.getHttpServer())
        .put('/log/restore')
        .send({ ids: [log.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isLogRestored = await prisma.log.findFirst({
        where: {
          ip: log.ip,
          deleted: { not: new Date() },
        },
      });
      expect(isLogRestored.deleted).not.toBeNull();
    });

    it('Should Not Hard Remove Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/user', '401');
      await prisma.log.delete({ where: { id: log.id } });

      await request(app.getHttpServer())
        .delete('/log/hard-remove')
        .send({ ids: [log.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isLogRemoved = await prisma.log.findFirst({
        where: {
          ip: log.ip,
          deleted: { not: new Date() },
        },
      });
      expect(isLogRemoved.deleted).not.toBeNull();
    });
  });

  describe('Private Routes (as Admin)', () => {
    it(`Should Return a Log List With ${ITEMS_PER_PAGE} Items`, async () => {
      const logsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          () =>
          ({
            ip: '127.0.0.1',
            method: 'POST',
            url: '/work',
            statusCode: '201',
          } as Log),
        );
      await prisma.log.createMany({
        data: logsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/log')
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    let randomNLogs = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Log List With ${randomNLogs} Items`, async () => {
      const logsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          () =>
          ({
            ip: '127.0.0.1',
            method: 'POST',
            url: '/work',
            statusCode: '201',
          } as Log),
        );
      await prisma.log.createMany({
        data: logsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get('/log')
        .query({ itemsPerPage: randomNLogs })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(randomNLogs);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(
        String(Math.ceil(+response.headers['x-total-count'] / randomNLogs)),
      );
    });

    it('Should Return a Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/work', '201');
      const response = await request(app.getHttpServer())
        .get(`/log/${log.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('Should Restore Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/user', '401');
      await prisma.log.delete({ where: { id: log.id } });

      await request(app.getHttpServer())
        .put('/log/restore')
        .send({ ids: [log.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isLogRestored = await prisma.log.findFirst({
        where: {
          ip: log.ip,
          deleted: null,
        },
      });
      expect(isLogRestored.deleted).toBeNull();
    });

    randomNLogs = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it('Should Remove All Logs', async () => {
      const logsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          () =>
          ({
            ip: '127.0.0.1',
            method: 'POST',
            url: '/work',
            statusCode: '201',
          } as Log),
        );
      await prisma.log.createMany({
        data: logsToCreate,
      });

      await request(app.getHttpServer())
        .delete('/log/clean')
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);


      const response = await request(app.getHttpServer())
        .get('/log')
        .query({ itemsPerPage: randomNLogs })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      // Log.clean() gonna be logged
      expect(response.body.data).toHaveLength(1);
      expect(response.headers['x-total-count']).toBe(String(1));
      expect(response.headers['x-total-pages']).toBe(
        String(Math.ceil(+response.headers['x-total-count'] / randomNLogs)),
      );
    });

    it('Should Hard Remove Log', async () => {
      const log = await createLog('127.0.0.1', 'POST', '/user', '401');
      await prisma.log.delete({ where: { id: log.id } });

      await request(app.getHttpServer())
        .delete('/log/hard-remove')
        .send({ ids: [log.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isLogRemoved = await prisma.log.findFirst({
        where: {
          ip: log.ip,
          deleted: { not: new Date() },
        },
      });
      expect(isLogRemoved).toBeNull();
    });
  });
});
