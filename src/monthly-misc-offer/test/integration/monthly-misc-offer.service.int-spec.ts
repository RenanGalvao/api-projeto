import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyMiscOffer, Role, User } from '@prisma/client';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { MonthlyMiscOfferService } from 'src/monthly-misc-offer/monthly-misc-offer.service';
import { PrismaService } from 'src/prisma/prisma.service';
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
import { MonthlyMiscOfferModule } from 'src/monthly-misc-offer/monthly-misc-offer.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Monthly Misc Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyMiscOfferService: MonthlyMiscOfferService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
        MonthlyMiscOfferModule,
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
    monthlyMiscOfferService = moduleRef.get(MonthlyMiscOfferService);

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
    it('Should Create a Monthly Misc Offer (as USER)', async () => {
      const monthlyMiscOffer = await monthlyMiscOfferService.create(user, {
        month,
        year,
        title,
        description,
        destination,
      });

      expect(monthlyMiscOffer.month).toBe(month);
      expect(monthlyMiscOffer.year).toBe(year);
      expect(monthlyMiscOffer.title).toBe(title);
      expect(monthlyMiscOffer.description).toBe(description);
      expect(monthlyMiscOffer.destination).toBe(destination);
      expect(monthlyMiscOffer.field.id).toBe(field.id);
    });

    it('Should Not Create a Monthly Misc Offer (as ADMIN && Missing Data)', async () => {
      try {
        await monthlyMiscOfferService.create(admin, {
          month,
          year,
          title,
          description,
          destination,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Monthly Misc Offer (as ADMIN)', async () => {
      const monthlyMiscOffer = await monthlyMiscOfferService.create(admin, {
        month,
        year,
        title,
        description,
        destination,
        field: field.id,
      });

      expect(monthlyMiscOffer.month).toBe(month);
      expect(monthlyMiscOffer.year).toBe(year);
      expect(monthlyMiscOffer.title).toBe(title);
      expect(monthlyMiscOffer.description).toBe(description);
      expect(monthlyMiscOffer.destination).toBe(destination);
      expect(monthlyMiscOffer.field.id).toBe(field.id);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await monthlyMiscOfferService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

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

      const response = await monthlyMiscOfferService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
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

      const response = await monthlyMiscOfferService.findAll({
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
      const monthlyMiscOffer = await monthlyMiscOfferService.findOne(randomId);

      expect(monthlyMiscOffer).toBeNull();
    });

    it('Should Return a Monthly Misc Offer', async () => {
      const monthlyMiscOfferCreated = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      const monthlyMiscOffer = await monthlyMiscOfferService.findOne(
        monthlyMiscOfferCreated.id,
      );
      expect(monthlyMiscOffer.month).toBe(month);
      expect(monthlyMiscOffer.year).toBe(year);
      expect(monthlyMiscOffer.title).toBe(title);
      expect(monthlyMiscOffer.description).toBe(description);
      expect(monthlyMiscOffer.destination).toBe(destination);
    });
  });

  describe('update()', () => {
    it('Should Not Update a Monthly Misc Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMiscOfferService.update(randomId, user, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
        );
      }
    });

    it('Should Not Update a Monthly Misc Offer (as USER && Different FIeld)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyMiscOffer = await createMonthlyMiscOffer(
          month,
          year,
          title,
          description,
          destination,
          differentField.id,
        );
        await monthlyMiscOfferService.update(monthlyMiscOffer.id, user, {
          title: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Monthly Misc Offer (as USER)', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      const newTitle = 'Novo Título';

      const monthlyMiscOfferUpdated = await monthlyMiscOfferService.update(
        monthlyMiscOffer.id,
        user,
        {
          title: newTitle,
        },
      );
      expect(monthlyMiscOfferUpdated).toBeDefined();
      expect(monthlyMiscOfferUpdated.title).toBe(newTitle);
    });

    it('Should Update a Monthly Misc Offer (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );
      const newTitle = 'Novo Título';

      const monthlyMiscOfferUpdated = await monthlyMiscOfferService.update(
        monthlyMiscOffer.id,
        admin,
        {
          title: newTitle,
          field: differentField.id,
        },
      );
      expect(monthlyMiscOfferUpdated).toBeDefined();
      expect(monthlyMiscOfferUpdated.title).toBe(newTitle);
      expect(monthlyMiscOfferUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Misc Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMiscOfferService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
        );
      }
    });

    it('Should Not Remove a Monthly Misc Offer (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyMiscOffer = await createMonthlyMiscOffer(
          month,
          year,
          title,
          description,
          destination,
          differentField.id,
        );
        await monthlyMiscOfferService.remove(monthlyMiscOffer.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Monthly Misc Offer (as USER)', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      await monthlyMiscOfferService.remove(monthlyMiscOffer.id, user);
      const isTestimonialDeleted = await prisma.monthlyMiscOffer.findFirst({
        where: {
          id: monthlyMiscOffer.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTestimonialDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Monthly Misc Offer (as ADMIN)', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      await monthlyMiscOfferService.remove(monthlyMiscOffer.id, admin);
      const isTestimonialDeleted = await prisma.monthlyMiscOffer.findFirst({
        where: {
          id: monthlyMiscOffer.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTestimonialDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
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

      await monthlyMiscOfferService.restore({ ids: [monthlyMiscOffer.id] });
      const isTestimonialRestored = await prisma.monthlyMiscOffer.findFirst({
        where: {
          id: monthlyMiscOffer.id,
        },
      });

      expect(isTestimonialRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
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

      await monthlyMiscOfferService.hardRemove({ ids: [monthlyMiscOffer.id] });
      const isTestimonialRemoved = await prisma.monthlyMiscOffer.findFirst({
        where: {
          id: monthlyMiscOffer.id,
          deleted: { not: new Date() },
        },
      });
      expect(isTestimonialRemoved).toBeNull();
    });
  });
});
