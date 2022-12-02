import { NestExpressApplication } from '@nestjs/platform-express';
import { Field, Role, User } from '@prisma/client';
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

describe('Field Controller E2E', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cacheManager: Cache;

  let user: User;
  let userToken: string;
  let admin: User;
  let adminToken: string;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
  const baseRoute = '/field';

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
  });

  describe('Private Routes (as Non Logged User)', () => {
    const continent = 'América';
    const country = 'Brasil';
    const state = 'Rio de Janeiro';
    const abbreviation = 'AMEBRRJ01';
    const designation = 'Designação';

    it('Should Not Create a Field', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          continent,
          country,
          state,
          abbreviation,
          designation,
        })
        .expect(401);
    });

    it('Should Not Update a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${field.id}`)
        .send({ continent: 'Ásia' })
        .expect(401);
    });

    it('Should Not Remove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${field.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [field.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [field.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.field.findUnique({
        where: { id: field.id },
      });
      const [fieldExists] = await prisma.$transaction([query]);
      expect(fieldExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    const continent = 'América';
    const country = 'Brasil';
    const state = 'Rio de Janeiro';
    const abbreviation = 'AMEBRRJ01';
    const designation = 'Designação';

    it('Should Not create a Field', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Update a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      const newContinent = 'África';

      await request(app.getHttpServer())
        .put(`${baseRoute}/${field.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ continent: newContinent })
        .expect(403);
    });

    it('Should Not Remove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${field.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Not Restore a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [field.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [field.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.field.findUnique({
        where: { id: field.id },
      });
      const [fieldExists] = await prisma.$transaction([query]);
      expect(fieldExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    const continent = 'América';
    const country = 'Brasil';
    const state = 'Rio de Janeiro';
    const abbreviation = 'AMEBRRJ01';
    const designation = 'Designação';

    it('Should Not Create a Field (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Field', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          continent,
          country,
          state,
          abbreviation,
          designation,
        })
        .expect(201);

      expect(res.body.data.continent).toBe(continent);
      expect(res.body.data.country).toBe(country);
      expect(res.body.data.state).toBe(state);
      expect(res.body.data.abbreviation).toBe(abbreviation);
      expect(res.body.data.designation).toBe(designation);
    });

    it('Should Update a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      const newContinent = 'Ásia';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${field.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ continent: newContinent })
        .expect(200);

      expect(res.body.data.continent).toBe(newContinent);
    });

    it('Should Remove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${field.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Restore a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [field.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [field.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.volunteer.findUnique({
        where: { id: field.id },
      });
      const [fieldExists] = await prisma.$transaction([query]);
      expect(fieldExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    const continent = 'América';
    const country = 'Brasil';
    const state = 'Rio de Janeiro';
    const abbreviation = 'AMEBRRJ01';
    const designation = 'Designação';

    it(`Should Return a Field List With ${ITEMS_PER_PAGE} Items`, async () => {
      const fieldsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              continent,
              country,
              state,
              abbreviation: `AMEBRRJ${i}`,
              designation,
            } as Field),
        );
      await prisma.field.createMany({
        data: fieldsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Volunteer List With ${randomN} Items`, async () => {
      const fieldsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              continent,
              country,
              state,
              abbreviation: `AMEBRRJ${i}`,
              designation,
            } as Field),
        );
      await prisma.field.createMany({
        data: fieldsToCreate,
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

    it('Should Return a Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${field.id}`)
        .expect(200);

      expect(res.body.data.continent).toBe(continent);
      expect(res.body.data.country).toBe(country);
      expect(res.body.data.state).toBe(state);
      expect(res.body.data.abbreviation).toBe(abbreviation);
      expect(res.body.data.designation).toBe(designation);
    });
  });
});
