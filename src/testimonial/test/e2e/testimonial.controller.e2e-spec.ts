import { NestExpressApplication } from '@nestjs/platform-express';
import { Field, Role, Testimonial, User } from '@prisma/client';
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

import {
  CacheInterceptor,
  CacheModule,
  CacheStore,
  CACHE_MANAGER,
} from '@nestjs/common';
import { ITEMS_PER_PAGE } from 'src/constants';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { TestimonialModule } from 'src/testimonial/testimonial.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Testimonial Controller E2E', () => {
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
  const baseRoute = '/testimonial';

  const name = 'João';
  const email = 'joao@email.com';
  const text = 'Texto';

  const createTestimonial = async (
    name: string,
    email: string,
    text: string,
    field: string,
  ) =>
    await prisma.testimonial.create({
      data: {
        name,
        email,
        text,
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
        TestimonialModule,
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
    it('Should Not Create a Testimonial', async () => {
      await request(app.getHttpServer())
        .post(baseRoute)
        .send({
          name,
          email,
          text,
          field: field.id,
        })
        .expect(401);
    });

    it('Should Not Update a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await request(app.getHttpServer())
        .put(`${baseRoute}/${testimonial.id}`)
        .send({ name: 'Abreu' })
        .expect(401);
    });

    it('Should Not Remove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);

      await request(app.getHttpServer())
        .delete(`${baseRoute}/${testimonial.id}`)
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should Not Restore a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .send({ ids: [testimonial.id] })
        .expect(401);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .send({ ids: [testimonial.id] })
        .expect(401);

      // Bypass Soft Delete
      const query = prisma.testimonial.findUnique({
        where: { id: testimonial.id },
      });
      const [testimonialExists] = await prisma.$transaction([query]);
      expect(testimonialExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged User)', () => {
    it('Should Not Create a Testimonial (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Testimonial', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name,
          email,
          text,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.text).toBe(text);
    });

    it('Should Not Update a Testimonial (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const testimonial = await createTestimonial(
        name,
        email,
        text,
        differentField.id,
      );
      const newName = 'Novo Nome';

      await request(app.getHttpServer())
        .put(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: newName })
        .expect(403);
    });

    it('Should Update a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      const newName = 'Novo Nome';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.data.name).toBe(newName);
    });

    it('Should Not Remove a Testimonial (Different Field)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const testimonial = await createTestimonial(
        name,
        email,
        text,
        differentField.id,
      );
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Should Remove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Not Restore a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [testimonial.id] })
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it('Should Not HardRemove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [testimonial.id] })
        .expect(403);

      // Bypass Soft Delete
      const query = prisma.testimonial.findUnique({
        where: { id: testimonial.id },
      });
      const [testimonialExists] = await prisma.$transaction([query]);
      expect(testimonialExists).toBeTruthy();
    });
  });

  describe('Private Routes (as Logged ADMIN)', () => {
    it('Should Not Create a Testimonial (Missing Data)', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('Should Create a Testimonial', async () => {
      const res = await request(app.getHttpServer())
        .post(baseRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name,
          email,
          text,
          field: field.id,
        })
        .expect(201);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.text).toBe(text);
    });

    it('Should Update a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      const newName = 'Novo Nome';

      const res = await request(app.getHttpServer())
        .put(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.data.name).toBe(newName);
    });

    it('Should Remove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await request(app.getHttpServer())
        .delete(`${baseRoute}/${testimonial.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBe(null);
    });

    it('Should Restore a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .put(`${baseRoute}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [testimonial.id] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });

    it('Should HardRemove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await request(app.getHttpServer())
        .delete(`${baseRoute}/hard-remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [testimonial.id] })
        .expect(200);

      // Bypass Soft Delete
      const query = prisma.testimonial.findUnique({
        where: { id: testimonial.id },
      });
      const [testimonialExists] = await prisma.$transaction([query]);
      expect(testimonialExists).toBeNull();
    });
  });

  describe('Public Routes (as Non Logged User)', () => {
    it(`Should Return a Testimonial List With ${ITEMS_PER_PAGE} Items`, async () => {
      const testimonialsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `Título ${i}`,
              email,
              text,
              fieldId: field.id,
            } as Testimonial),
        );
      await prisma.testimonial.createMany({
        data: testimonialsToCreate,
      });

      const response = await request(app.getHttpServer())
        .get(baseRoute)
        .expect(200);

      expect(response.body.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.headers['x-total-count']).toBe(String(ITEMS_PER_PAGE));
      expect(response.headers['x-total-pages']).toBe(String(1));
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Testimonial List With ${randomN} Items`, async () => {
      const testimonialsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `Título ${i}`,
              email,
              text,
              fieldId: field.id,
            } as Testimonial),
        );
      await prisma.testimonial.createMany({
        data: testimonialsToCreate,
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

    it('Should Return a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);

      const res = await request(app.getHttpServer())
        .get(`${baseRoute}/${testimonial.id}`)
        .expect(200);

      expect(res.body.data.name).toBe(name);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.text).toBe(text);
    });
  });
});
