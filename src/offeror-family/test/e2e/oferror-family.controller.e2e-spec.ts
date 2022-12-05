import { NestExpressApplication } from '@nestjs/platform-express';
import {
  Field,
  OfferorFamily,
  OfferorFamilyGroup,
  Role,
  User,
} from '@prisma/client';
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

describe('Offeror Family Controller E2E', () => {
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
  const baseRoute = '/offeror-family';

  const representative = 'Matheus';
  const commitment = 'Mantimento x';
  const group = OfferorFamilyGroup.COMMUNITY;

  const createOfferorFamily = async (
    representative: string,
    commitment: string,
    group: OfferorFamilyGroup,
    field: string,
  ) =>
    await prisma.offerorFamily.create({
      data: {
        representative,
        commitment,
        group,
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
    it('Should Not Create an Offeror Family', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          representative,
          commitment,
          group,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await request(app.getHttpServer())
        .put(`${baseRoute}/${offerorFamily.id}`)
        .send({ representative: 'Abreu' })
        .expect(401);
    });

    it('Should Not Remove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${offerorFamily.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [offerorFamily.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [offerorFamily.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.offerorFamily.findUnique({
        where: { id: offerorFamily.id },
      });
      const [offerorFamilyExists] = await prisma.$transaction([query]);
      expect(offerorFamilyExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create an Offeror Family', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create an Offeror Family', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          representative,
          commitment,
          group,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.representative).toBe(representative);
      expect(res.body.data.commitment).toBe(commitment);
      expect(res.body.data.group).toBe(group);
    });

    it('Should Update an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${offerorFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ representative: newRepresentative })
        .expect(200);

      expect(res.body.data.representative).toBe(newRepresentative);
    });

    it('Should Remove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${offerorFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [offerorFamily.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [offerorFamily.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.offerorFamily.findUnique({
        where: { id: offerorFamily.id },
      });
      const [offerorFamilyExists] = await prisma.$transaction([query]);
      expect(offerorFamilyExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create an Offeror Family', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create an Offeror Family', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          representative,
          commitment,
          group,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.representative).toBe(representative);
      expect(res.body.data.commitment).toBe(commitment);
      expect(res.body.data.group).toBe(group);
    });

    it('Should Update an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${offerorFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ representative: newRepresentative })
        .expect(200);

      expect(res.body.data.representative).toBe(newRepresentative);
    });

    it('Should Remove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${offerorFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [offerorFamily.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [offerorFamily.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.offerorFamily.findUnique({
        where: { id: offerorFamily.id },
      });
      const [offerorFamilyExists] = await prisma.$transaction([query]);
      expect(offerorFamilyExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return an Offeror Family List With ${ITEMS_PER_PAGE} Items`, async () => {
      const offerorFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              commitment,
              group,
              fieldId: field.id,
            } as OfferorFamily),
        );
      await prisma.offerorFamily.createMany({
        data: offerorFamiliesToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Offeror Family List With ${randomN} Items`, async () => {
      const offerorFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              commitment,
              group,
              fieldId: field.id,
            } as OfferorFamily),
        );
      await prisma.offerorFamily.createMany({
        data: offerorFamiliesToCreate,
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
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${offerorFamily.id}`)
        .expect(200);

      expect(res.body.data.representative).toBe(representative);
      expect(res.body.data.commitment).toBe(commitment);
      expect(res.body.data.group).toBe(group);
    });
  });
});
