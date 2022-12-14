import { NestExpressApplication } from '@nestjs/platform-express';
import { Field, MonthlyFoodOffer, Role, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import {
  createField,
  createUser,
  getToken,
  setAppConfig,
} from 'src/utils/test';
import { ITEMS_PER_PAGE } from 'src/constants';

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
import { AgendaModule } from 'src/agenda/agenda.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';
import { MonthlyFoodOfferModule } from 'src/monthly-food-offer/monthly-food-offer.module';

describe('Monthly Food Offer Controller E2E', () => {
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
  const baseRoute = '/monthly-food-offer';

  const month = 1;
  const year = 2022;
  const food = 'alimento';
  const communityCollection = 1;
  const communityCollectionExternal = 1;
  const communityCollectionExtra = 1;
  const churchCollection = 1;
  const churchCollectionExternal = 1;
  const churchCollectionExtra = 1;

  const createMonthlyFoodOffer = async (
    month: number,
    year: number,
    food: string,
    communityCollection: number,
    communityCollectionExternal: number,
    communityCollectionExtra: number,
    churchCollection: number,
    churchCollectionExternal: number,
    churchCollectionExtra: number,
    field: string,
  ) =>
    await prisma.monthlyFoodOffer.create({
      data: {
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
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
        MonthlyFoodOfferModule,
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
      'Am??rica',
      'Brasil',
      'Rio de Janeiro',
      'AMEBRRJ01',
      'Designa????o',
    );

    user = await createUser(
      prisma,
      'Jo??o',
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
    it('Should Not Create a Monthly Food Offer', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyFoodOffer.id}`)
        .send({ food: 'Alimento 2' })
        .expect(401);
    });

    it('Should Not Remove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.monthlyFoodOffer.findUnique({
        where: { id: monthlyFoodOffer.id },
      });
      const [monthlyFoodOfferExists] = await prisma.$transaction([query]);
      expect(monthlyFoodOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Monthly Food Offer (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Food Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.food).toBe(food);
      expect(res.body.data.communityCollection).toBe(communityCollection);
      expect(res.body.data.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(res.body.data.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(res.body.data.churchCollection).toBe(churchCollection);
      expect(res.body.data.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(res.body.data.churchCollectionExtra).toBe(churchCollectionExtra);
    });

    it('Should Not Update a Monthly Food Offer (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'Am??rica',
        'Brasil',
        'S??o Paulo',
        'AMEBRSP01',
        'Designa????o',
      );
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        differentField.id,
      );
      const newFood = 'Novo Alimento';

      await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ food: newFood })
        .expect(403);
    });

    it('Should Update a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      const newFood = 'Novo Alimento';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ food: newFood })
        .expect(200);

      expect(res.body.data.food).toBe(newFood);
    });

    it('Should Not Remove a Monthly Food Offer (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'Am??rica',
        'Brasil',
        'S??o Paulo',
        'AMEBRSP01',
        'Designa????o',
      );
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        differentField.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Remove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.monthlyFoodOffer.findUnique({
        where: { id: monthlyFoodOffer.id },
      });
      const [monthlyFoodOfferExists] = await prisma.$transaction([query]);
      expect(monthlyFoodOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Monthly Food Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Food Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.food).toBe(food);
      expect(res.body.data.communityCollection).toBe(communityCollection);
      expect(res.body.data.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(res.body.data.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(res.body.data.churchCollection).toBe(churchCollection);
      expect(res.body.data.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(res.body.data.churchCollectionExtra).toBe(churchCollectionExtra);
    });

    it('Should Update a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      const newFood = 'Novo Alimento';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ food: newFood })
        .expect(200);

      expect(res.body.data.food).toBe(newFood);
    });

    it('Should Remove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyFoodOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyFoodOffer.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.monthlyFoodOffer.findUnique({
        where: { id: monthlyFoodOffer.id },
      });
      const [monthlyFoodOfferExists] = await prisma.$transaction([query]);
      expect(monthlyFoodOfferExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Monthly Food Offer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const monthlyFoodOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              food: `Alimento ${i}`,
              communityCollection,
              communityCollectionExternal,
              communityCollectionExtra,
              churchCollection,
              churchCollectionExternal,
              churchCollectionExtra,
              fieldId: field.id,
            } as MonthlyFoodOffer),
        );
      await prisma.monthlyFoodOffer.createMany({
        data: monthlyFoodOffersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Monthly Food Offer List With ${randomN} Items`, async () => {
      const monthlyFoodOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              food: `Alimento ${i}`,
              communityCollection,
              communityCollectionExternal,
              communityCollectionExtra,
              churchCollection,
              churchCollectionExternal,
              churchCollectionExtra,
              fieldId: field.id,
            } as MonthlyFoodOffer),
        );
      await prisma.monthlyFoodOffer.createMany({
        data: monthlyFoodOffersToCreate,
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

    it('Should Return a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyFoodOffer.id}`)
        .expect(200);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.food).toBe(food);
      expect(res.body.data.communityCollection).toBe(communityCollection);
      expect(res.body.data.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(res.body.data.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(res.body.data.churchCollection).toBe(churchCollection);
      expect(res.body.data.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(res.body.data.churchCollectionExtra).toBe(churchCollectionExtra);
    });
  });
});
