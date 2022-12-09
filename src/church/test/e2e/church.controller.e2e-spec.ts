import { NestExpressApplication } from '@nestjs/platform-express';
import { Church, Field, Role, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { ITEMS_PER_PAGE } from 'src/constants';
import {
  createField,
  createUser,
  getToken,
  setAppConfig,
} from 'src/utils/test';

import {
  CacheInterceptor,
  CacheModule,
  CacheStore,
  CACHE_MANAGER,
} from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { ChurchModule } from 'src/church/church.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Church Controller E2E', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cacheManager: Cache;

  let field: Field;
  let user: User;
  let userToken: string;
  let admin: User;
  let adminToken: string;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
  const baseRoute = '/church';

  const name = 'Igreja';
  const description = 'Descrição';
  const image = 'imagem.webp';

  const createChurch = async (
    name: string,
    description: string,
    image: string,
    field: string,
  ) =>
    await prisma.church.create({
      data: {
        name,
        description,
        image,
        field: {
          connect: {
            id: field,
          },
        },
      },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        // https://github.com/dabroek/node-cache-manager-redis-store/issues/53
        CacheModule.registerAsync({
          isGlobal: true,
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => ({
            store: (await redisStore({
              url: config.get('REDIS_URL'),
            })) as unknown as CacheStore,
            ttl: config.get('redis.ttl'),
            max: config.get('redis.max'),
            isCacheableValue: (val: any) => val !== undefined && val !== null,
          }),
        }),

        // Basic Routes
        AuthModule,
        PrismaModule,
        UserModule,

        // Specific
        FieldModule,
        ChurchModule,
      ],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: CacheInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: CacheControlInterceptor,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setAppConfig(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
    cacheManager = moduleRef.get(CACHE_MANAGER);
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

    user = await createUser(
      prisma,
      'João',
      'volunteer@email.com',
      hashedPassword,
      Role.VOLUNTEER,
      field.id,
    );
    userToken = await getToken(app, user.email, password);

    admin = await createUser(
      prisma,
      'Admin',
      'sigma@email.com',
      hashedPassword,
      Role.ADMIN,
    );
    adminToken = await getToken(app, admin.email, password);
  });

  describe('Private Routes (as Non Logged User)', () => {
    it('Should Not Create a Church', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          name,
          description,
          image,
        })
        .expect(401);
    });

    it('Should Not Update a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await request(app.getHttpServer())
        .put(`${baseRoute}/${church.id}`)
        .send({ name: 'Igreja 1' })
        .expect(401);
    });

    it('Should Not Remove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${church.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [church.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [church.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.church.findUnique({
        where: { id: church.id },
      });
      const [churchExists] = await prisma.$transaction([query]);
      expect(churchExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Church (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Church', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name,
          description,
          image,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.image).toBe(image);
    });

    it('Should Not Update a Church (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const church = await createChurch(
        name,
        description,
        image,
        differentField.id,
      );
      const newName = 'Igreja 1';

      await request(app.getHttpServer())
        .put(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: newName })
        .expect(403);
    });

    it('Should Update a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      const newName = 'Igreja 1';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.data.name).toBe(newName);
    });

    it('Should Not Remove a Church (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const church = await createChurch(
        name,
        description,
        image,
        differentField.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Remove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [church.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [church.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.church.findUnique({
        where: { id: church.id },
      });
      const [churchExists] = await prisma.$transaction([query]);
      expect(churchExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Church (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Church', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name,
          description,
          image,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.image).toBe(image);
    });

    it('Should Update a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      const newName = 'Igreja 1';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.data.name).toBe(newName);
    });

    it('Should Remove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${church.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [church.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [church.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.church.findUnique({
        where: { id: church.id },
      });
      const [churchExists] = await prisma.$transaction([query]);
      expect(churchExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Church List With ${ITEMS_PER_PAGE} Items`, async () => {
      const churchesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `João ${i}`,
              description,
              image: `imagem-${i}.webp`,
              fieldId: field.id,
            } as Church),
        );
      await prisma.church.createMany({
        data: churchesToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Church List With ${randomN} Items`, async () => {
      const churchesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `João ${i}`,
              description,
              image: `imagem-${i}.webp`,
              fieldId: field.id,
            } as Church),
        );
      await prisma.church.createMany({
        data: churchesToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .query({ itemsPerPage: randomN })
        .expect(200);

      expect(response.body.data).toHaveLength(randomN);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(
        String(Math.ceil(+response.headers['x-total-count'] / randomN)),
      );
    });

    it('Should Return a Church', async () => {
      const church = await createChurch(name, description, image, field.id);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${church.id}`)
        .expect(200);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.image).toBe(image);
    });
  });
});
