import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Role, Testimonial, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { TestimonialService } from 'src/testimonial/testimonial.service';
import { createField, createUser } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { CacheInterceptor, CacheModule, CacheStore } from '@nestjs/common';
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

describe('Testimonial Service Integration', () => {
  let prisma: PrismaService;
  let testimonialService: TestimonialService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const name = 'Nome';
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

    prisma = moduleRef.get(PrismaService);
    testimonialService = moduleRef.get(TestimonialService);

    // enable soft delete
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();

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

    admin = await createUser(
      prisma,
      'admin',
      'sigma@email.com',
      hashedPassword,
      Role.ADMIN,
    );
  });

  describe('create()', () => {
    it('Should Create a Testimonial (as USER)', async () => {
      const testimonial = await testimonialService.create(user, {
        name,
        email,
        text,
      });

      expect(testimonial.name).toBe(name);
      expect(testimonial.email).toBe(email);
      expect(testimonial.text).toStrictEqual(text);
      expect(testimonial.field.id).toBe(field.id);
    });

    it('Should Not Create an Event (as ADMIN && Missing Data)', async () => {
      try {
        await testimonialService.create(admin, {
          name,
          email,
          text,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Testimonial (as ADMIN)', async () => {
      const testimonial = await testimonialService.create(admin, {
        name,
        email,
        text,
        field: field.id,
      });

      expect(testimonial.name).toBe(name);
      expect(testimonial.email).toBe(email);
      expect(testimonial.text).toStrictEqual(text);
      expect(testimonial.field.id).toBe(field.id);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await testimonialService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

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

      const response = await testimonialService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
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

      const response = await testimonialService.findAll({
        itemsPerPage: randomN,
      });
      expect(response.data).toHaveLength(randomN);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(
        Math.ceil(response.totalCount / randomN),
      );
    });
  });

  describe('findOne()', () => {
    it("Should Return Null (Doesn't Exists)", async () => {
      const randomId = uuidv4();
      const testimonial = await testimonialService.findOne(randomId);

      expect(testimonial).toBeNull();
    });

    it('Should Return a Testimonial', async () => {
      const testimonialCreated = await createTestimonial(
        name,
        email,
        text,
        field.id,
      );

      const testimonial = await testimonialService.findOne(
        testimonialCreated.id,
      );
      expect(testimonial.name).toBe(name);
      expect(testimonial.email).toBe(email);
      expect(testimonial.text).toStrictEqual(text);
    });
  });

  describe('update()', () => {
    it('Should Not Update a Testimonial (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await testimonialService.update(randomId, user, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
        );
      }
    });

    it('Should Not Update a Testimonial (as USER && Different Field)', async () => {
      try {
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
        await testimonialService.update(testimonial.id, user, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Testimonial (as USER)', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      const newName = 'Novo Título';

      const testimonialUpdated = await testimonialService.update(
        testimonial.id,
        user,
        {
          name: newName,
        },
      );
      expect(testimonialUpdated).toBeDefined();
      expect(testimonialUpdated.name).toBe(newName);
    });

    it('Should Update a Testimonial (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const testimonial = await createTestimonial(name, email, text, field.id);
      const newName = 'Novo Título';

      const testimonialUpdated = await testimonialService.update(
        testimonial.id,
        user,
        {
          name: newName,
          field: differentField.id,
        },
      );
      expect(testimonialUpdated).toBeDefined();
      expect(testimonialUpdated.name).toBe(newName);
      expect(testimonialUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Testimonial (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await testimonialService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
        );
      }
    });

    it('Should Not Remove a Testimonial (as USER && Different Field)', async () => {
      try {
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
        await testimonialService.remove(testimonial.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Testimonial (as USER)', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);

      await testimonialService.remove(testimonial.id, user);
      const isTestimonialDeleted = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTestimonialDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Testimonial (as ADMIN)', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);

      await testimonialService.remove(testimonial.id, admin);
      const isTestimonialDeleted = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTestimonialDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await testimonialService.restore({ ids: [testimonial.id] });
      const isTestimonialRestored = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
        },
      });

      expect(isTestimonialRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Testimonial', async () => {
      const testimonial = await createTestimonial(name, email, text, field.id);
      await prisma.testimonial.delete({ where: { id: testimonial.id } });

      await testimonialService.hardRemove({ ids: [testimonial.id] });
      const isTestimonialRemoved = await prisma.testimonial.findFirst({
        where: {
          id: testimonial.id,
          deleted: { not: new Date() },
        },
      });
      expect(isTestimonialRemoved).toBeNull();
    });
  });
});
