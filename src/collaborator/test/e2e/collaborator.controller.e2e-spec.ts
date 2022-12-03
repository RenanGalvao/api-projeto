import { NestExpressApplication } from '@nestjs/platform-express';
import { Collaborator, Field, Role, User } from '@prisma/client';
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

describe('Collaborator Controller E2E', () => {
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
  const baseRoute = '/collaborator';

  const firstName = 'João';
  const description = 'Descrição';

  const createCollaborator = async (
    firstName: string,
    description: string,
    field: string,
  ) =>
    await prisma.collaborator.create({
      data: {
        firstName,
        description,
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
    it('Should Not Create a Collaborator', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          firstName,
          description,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${collaborator.id}`)
        .send({ firstName: 'Mario' })
        .expect(401);
    });

    it('Should Not Remove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${collaborator.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [collaborator.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [collaborator.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.collaborator.findUnique({
        where: { id: collaborator.id },
      });
      const [collaboratorExists] = await prisma.$transaction([query]);
      expect(collaboratorExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Collaborator (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Collaborator', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName,
          description,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.description).toBe(description);
    });

    it('Should Update a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      const newFirstName = 'Mario';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${collaborator.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: newFirstName })
        .expect(200);

      expect(res.body.data.firstName).toBe(newFirstName);
    });

    it('Should Remove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${collaborator.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [collaborator.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [collaborator.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.collaborator.findUnique({
        where: { id: collaborator.id },
      });
      const [collaboratorExists] = await prisma.$transaction([query]);
      expect(collaboratorExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Collaborator (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Collaborator', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName,
          description,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.description).toBe(description);
    });

    it('Should Update a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      const newFirstName = 'Mario';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${collaborator.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: newFirstName })
        .expect(200);

      expect(res.body.data.firstName).toBe(newFirstName);
    });

    it('Should Remove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${collaborator.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [collaborator.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [collaborator.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.collaborator.findUnique({
        where: { id: collaborator.id },
      });
      const [collaboratorExists] = await prisma.$transaction([query]);
      expect(collaboratorExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Collaborator List With ${ITEMS_PER_PAGE} Items`, async () => {
      const collaboratorsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              description,
              fieldId: field.id,
            } as Collaborator),
        );
      await prisma.collaborator.createMany({
        data: collaboratorsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Collaborator List With ${randomN} Items`, async () => {
      const collaboratorsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              description,
              fieldId: field.id,
            } as Collaborator),
        );
      await prisma.collaborator.createMany({
        data: collaboratorsToCreate,
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

    it('Should Return a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${collaborator.id}`)
        .expect(200);

      expect(res.body.data.firstName).toBe(firstName);
      expect(res.body.data.description).toBe(description);
    });
  });
});
