import { NestExpressApplication } from '@nestjs/platform-express';
import { Field, MonthlyMiscOffer, Role, User } from '@prisma/client';
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

describe('Monthly Misc Offer Controller E2E', () => {
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
  const baseRoute = '/monthly-misc-offer';

  const month = 1;
  const year = 2022;
  const title = 'Título';
  const description = 'Descrição';
  const destination = 'Destino';

  const createMonthlyMiscOffer = async (
    month: number,
    year: number,
    title: string,
    description: string,
    destination: string,
    field: string,
  ) =>
    await prisma.monthlyMiscOffer.create({
      data: {
        month,
        year,
        title,
        description,
        destination,
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
    it('Should Not Create a Monthly Misc Offer', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          month,
          year,
          title,
          description,
          destination,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMiscOffer.id}`)
        .send({ name: 'Abreu' })
        .expect(401);
    });

    it('Should Not Remove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a montMonthly Misc OfferhlyMiscOffer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.monthlyMiscOffer.findUnique({
        where: { id: monthlyMiscOffer.id },
      });
      const [monthlyMiscOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMiscOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Monthly Misc Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Misc Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          month,
          year,
          title,
          description,
          destination,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.title).toBe(title);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.destination).toBe(destination);
    });

    it('Should Update a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      const newTitle = 'Novo Título';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMiscOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: newTitle })
        .expect(200);

      expect(res.body.data.title).toBe(newTitle);
    });

    it('Should Remove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMiscOffer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.monthlyMiscOffer.findUnique({
        where: { id: monthlyMiscOffer.id },
      });
      const [monthlyMiscOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMiscOfferExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Monthly Misc Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Monthly Misc Offer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month,
          year,
          title,
          description,
          destination,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.title).toBe(title);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.destination).toBe(destination);
    });

    it('Should Update a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      const newTitle = 'Novo Título';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${monthlyMiscOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: newTitle })
        .expect(200);

      expect(res.body.data.title).toBe(newTitle);
    });

    it('Should Remove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${monthlyMiscOffer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      await prisma.monthlyMiscOffer.delete({
        where: { id: monthlyMiscOffer.id },
      });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [monthlyMiscOffer.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.monthlyMiscOffer.findUnique({
        where: { id: monthlyMiscOffer.id },
      });
      const [monthlyMiscOfferExists] = await prisma.$transaction([query]);
      expect(monthlyMiscOfferExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Monthly Misc Offer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const monthlyMiscOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              title: `Título ${i}`,
              description,
              destination,
              fieldId: field.id,
            } as MonthlyMiscOffer),
        );
      await prisma.monthlyMiscOffer.createMany({
        data: monthlyMiscOffersToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Monthly Misc Offer List With ${randomN} Items`, async () => {
      const monthlyMiscOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              title: `Título ${i}`,
              description,
              destination,
              fieldId: field.id,
            } as MonthlyMiscOffer),
        );
      await prisma.monthlyMiscOffer.createMany({
        data: monthlyMiscOffersToCreate,
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

    it('Should Return a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${monthlyMiscOffer.id}`)
        .expect(200);

      expect(res.body.data.month).toBe(month);
      expect(res.body.data.year).toBe(year);
      expect(res.body.data.title).toBe(title);
      expect(res.body.data.description).toBe(description);
      expect(res.body.data.destination).toBe(destination);
    });
  });
});
