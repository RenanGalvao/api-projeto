import { CACHE_MANAGER } from '@nestjs/common';
import { Field, Role, User, Volunteer } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { createUser, createField, getToken, setAppConfig } from 'src/utils/test';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { ITEMS_PER_PAGE } from 'src/constants';
import { NestExpressApplication } from '@nestjs/platform-express';

describe('Volunteer Controller E2E', () => {
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
  const baseRoute = '/volunteer';

  const createVolunteer = async (
    firstName: string,
    joinedDate: Date,
    field: string,
  ) =>
    await prisma.volunteer.create({
      data: {
        firstName,
        joinedDate,
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
    const firstName = 'Mario';
    const joinedDate = new Date('2022-01-01');

    it('Should Not Create a Volunteer', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          firstName,
          joinedDate,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await request(app.getHttpServer())
        .put(`${baseRoute}/${volunteer.id}`)
        .send({ lastName: 'Abreu' })
        .expect(401);
    });

    it('Should Not Remove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${volunteer.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [volunteer.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [volunteer.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });
      const [volunteerExists] = await prisma.$transaction([query]);
      expect(volunteerExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    const firstName = 'Mario';
    const joinedDate = new Date('2022-01-01');

    it('Should Not Create a Volunteer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Volunteer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName,
          joinedDate,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.joinedDate).toBe(joinedDate.toISOString());
    });

    it('Should Update a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      const lastName = 'Abreu';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${volunteer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ lastName })
        .expect(200);

      expect(res.body.data.lastName).toBe(lastName);
    });

    it('Should Remove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${volunteer.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [volunteer.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [volunteer.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });
      const [volunteerExists] = await prisma.$transaction([query]);
      expect(volunteerExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    const firstName = 'Mario';
    const joinedDate = new Date('2022-01-01');

    it('Should Not Create a Volunteer (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Volunteer', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName,
          joinedDate,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.joinedDate).toBe(joinedDate.toISOString());
    });

    it('Should Update a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      const lastName = 'Abreu';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${volunteer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lastName })
        .expect(200);

      expect(res.body.data.lastName).toBe(lastName);
    });

    it('Should Remove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${volunteer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Restore a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [volunteer.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Volunteer', async () => {
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);
      await prisma.volunteer.delete({ where: { id: volunteer.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [volunteer.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.volunteer.findUnique({
        where: { id: volunteer.id },
      });
      const [volunteerExists] = await prisma.$transaction([query]);
      expect(volunteerExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Volunteer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const volunteersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              joinedDate: new Date('2022-01-03'),
              fieldId: field.id,
            } as Volunteer),
        );
      await prisma.volunteer.createMany({
        data: volunteersToCreate,
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
      const volunteersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              joinedDate: new Date('2022-01-03'),
              fieldId: field.id,
            } as Volunteer),
        );
      await prisma.volunteer.createMany({
        data: volunteersToCreate,
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

    it('Should Return a Volunteer', async () => {
      const firstName = 'Mario';
      const joinedDate = new Date('2022-01-01');
      const volunteer = await createVolunteer(firstName, joinedDate, field.id);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${volunteer.id}`)
        .expect(200);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.joinedDate).toBe(joinedDate.toISOString());
    });
  });
});
