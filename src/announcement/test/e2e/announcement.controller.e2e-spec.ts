import { NestExpressApplication } from '@nestjs/platform-express';
import { Announcement, Field, Role, User } from '@prisma/client';
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

describe('Announcement Controller E2E', () => {
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
  const baseRoute = '/announcement';

  const title = 'Título';
  const message = 'Mensagem';
  const date = new Date('2022-02-02');

  const createAnnouncement = async (
    title: string,
    message: string,
    date: Date,
    field: string,
  ) =>
    await prisma.announcement.create({
      data: {
        title,
        message,
        date,
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
    it('Should Not Create an Announcement', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          title,
          message,
          date,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${announcement.id}`)
        .send({ representative: 'Abreu' })
        .expect(401);
    });

    it('Should Not Remove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${announcement.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [announcement.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [announcement.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.announcement.findUnique({
        where: { id: announcement.id },
      });
      const [announcementExists] = await prisma.$transaction([query]);
      expect(announcementExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create an Announcement', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create an Announcement', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title,
          message,
          date,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.title).toBe(title);
      expect(res.body.data.message).toBe(message);
      expect(res.body.data.date).toBe(date.toISOString());
    });

    it('Should Update an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      const newTitle = 'Novo Título';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${announcement.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: newTitle })
        .expect(200);

      expect(res.body.data.title).toBe(newTitle);
    });

    it('Should Remove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${announcement.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [announcement.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [announcement.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.announcement.findUnique({
        where: { id: announcement.id },
      });
      const [announcementExists] = await prisma.$transaction([query]);
      expect(announcementExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create an Announcement', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create an Announcement', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title,
          message,
          date,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.title).toBe(title);
      expect(res.body.data.message).toBe(message);
      expect(res.body.data.date).toBe(date.toISOString());
    });

    it('Should Update an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      const newTitle = 'Novo Título';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${announcement.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: newTitle })
        .expect(200);

      expect(res.body.data.title).toBe(newTitle);
    });

    it('Should Remove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${announcement.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [announcement.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [announcement.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.announcement.findUnique({
        where: { id: announcement.id },
      });
      const [announcementExists] = await prisma.$transaction([query]);
      expect(announcementExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return an Announcement List With ${ITEMS_PER_PAGE} Items`, async () => {
      const announcementsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message,
              date,
              fieldId: field.id,
            } as Announcement),
        );
      await prisma.announcement.createMany({
        data: announcementsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Assisted Family List With ${randomN} Items`, async () => {
      const announcementsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message,
              date,
              fieldId: field.id,
            } as Announcement),
        );
      await prisma.announcement.createMany({
        data: announcementsToCreate,
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

    it('Should Return an Assisted Family', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${announcement.id}`)
        .expect(200);

      expect(res.body.data.title).toBe(title);
      expect(res.body.data.message).toBe(message);
      expect(res.body.data.date).toBe(date.toISOString());
    });
  });
});