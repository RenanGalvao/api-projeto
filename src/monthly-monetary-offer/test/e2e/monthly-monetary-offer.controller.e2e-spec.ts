import { NestExpressApplication } from '@nestjs/platform-express';
import { Field, MonthlyMonetaryOffer, Role, User } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import {
  createField,
  createUser,
  getToken,
  setAppConfig,
} from 'src/utils/test';
import { CACHE_MANAGER } from '@nestjs/common';
import { ITEMS_PER_PAGE } from 'src/constants';

describe('Monthly Monetary Offer Controller E2E', () => {
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
  const baseRoute = '/monthly-monetary-offer';

  const month = 1;
  const year = 2022;
  const openingBalance = 0;
  const offersValue = 12.5;
  const offersDescription = 'Descrição';
  const spentValue = 9.3;
  const spentDescription = 'Descrição 2';

  const createMonthlyMonetaryOffer = async (
    month: number,
    year: number,
    openingBalance: number,
    offersValue: number,
    offersDescription: string,
    spentValue: number,
    spentDescription: string,
    field: string,
  ) =>
    await prisma.monthlyMonetaryOffer.create({
      data: {
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field: {
          connect: {
            id: field,
          },
        },
      },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setAppConfig(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    user = await createUser(
      prisma,
      'João',
      'volunteer@email.com',
      hashedPassword,
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

  describe('Private Routes (as Non Logged User)', () => {
    it('Should Not Create a Monthly Monetary Offer', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .send({ offersDescription: 'Outra Descrição' })
        .expect(401);
    });

    it('Should Not Remove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.monthlyMonetaryOffer.findUnique({
        where: { id: monthlyMonetaryOffer.id },
      });
      const [monthlyMonetaryOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMonetaryOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Monthly Monetary Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Monetary Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.openingBalance).toBe(openingBalance);
      expect(res.body.data.offersValue).toBe(offersValue);
      expect(res.body.data.offersDescription).toBe(offersDescription);
      expect(res.body.data.spentValue).toBe(spentValue);
      expect(res.body.data.spentDescription).toBe(spentDescription);
    });

    it('Should Update a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      const newYear = 2021;

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ year: newYear })
        .expect(200);

      expect(res.body.data.year).toBe(newYear);
    });

    it('Should Remove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.monthlyMonetaryOffer.findUnique({
        where: { id: monthlyMonetaryOffer.id },
      });
      const [monthlyMonetaryOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMonetaryOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Monthly Monetary Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Monetary Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.openingBalance).toBe(openingBalance);
      expect(res.body.data.offersValue).toBe(offersValue);
      expect(res.body.data.offersDescription).toBe(offersDescription);
      expect(res.body.data.spentValue).toBe(spentValue);
      expect(res.body.data.spentDescription).toBe(spentDescription);
    });

    it('Should Update a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      const newYear = 2021;

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ year: newYear })
        .expect(200);

      expect(res.body.data.year).toBe(newYear);
    });

    it('Should Remove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );
      await prisma.monthlyMonetaryOffer.delete({
        where: { id: monthlyMonetaryOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyMonetaryOffer.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.monthlyMonetaryOffer.findUnique({
        where: { id: monthlyMonetaryOffer.id },
      });
      const [monthlyMonetaryOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMonetaryOfferExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Monthly Monetary Offer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const monthlyMonetaryOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              openingBalance,
              offersValue,
              offersDescription,
              spentValue,
              spentDescription: `Descrição ${i}`,
              fieldId: field.id,
            } as MonthlyMonetaryOffer),
        );
      await prisma.monthlyMonetaryOffer.createMany({
        data: monthlyMonetaryOffersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Monthly Monetary Offer List With ${randomN} Items`, async () => {
      const monthlyMonetaryOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              openingBalance,
              offersValue,
              offersDescription,
              spentValue,
              spentDescription: `Descrição ${i}`,
              fieldId: field.id,
            } as MonthlyMonetaryOffer),
        );
      await prisma.monthlyMonetaryOffer.createMany({
        data: monthlyMonetaryOffersToCreate,
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

    it('Should Return a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMonetaryOffer.id}`)
        .expect(200);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.openingBalance).toBe(openingBalance);
      expect(res.body.data.offersValue).toBe(offersValue);
      expect(res.body.data.offersDescription).toBe(offersDescription);
      expect(res.body.data.spentValue).toBe(spentValue);
      expect(res.body.data.spentDescription).toBe(spentDescription);
    });
  });
});
