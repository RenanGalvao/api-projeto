import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyMonetaryOffer, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { MonthlyMonetaryOfferService } from 'src/monthly-monetary-offer/monthly-monetary-offer.service';
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
import { MonthlyMonetaryOfferModule } from 'src/monthly-monetary-offer/monthly-monetary-offer.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Monthly Monetary Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyMonetaryOfferService: MonthlyMonetaryOfferService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
        MonthlyMonetaryOfferModule,
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
    monthlyMonetaryOfferService = moduleRef.get(MonthlyMonetaryOfferService);

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
    it('Should Create a Monthly Monetary Offer (as User)', async () => {
      const monthlyMonetaryOffer = await monthlyMonetaryOfferService.create(
        user,
        {
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
        },
      );

      expect(monthlyMonetaryOffer.month).toBe(month);
      expect(monthlyMonetaryOffer.year).toBe(year);
      expect(monthlyMonetaryOffer.openingBalance).toBe(openingBalance);
      expect(monthlyMonetaryOffer.offersValue).toBe(offersValue);
      expect(monthlyMonetaryOffer.offersDescription).toBe(offersDescription);
      expect(monthlyMonetaryOffer.spentValue).toBe(spentValue);
      expect(monthlyMonetaryOffer.spentDescription).toBe(spentDescription);
      expect(monthlyMonetaryOffer.field.id).toBe(field.id);
    });

    it('Should Not Create an Event (as ADMIN && Missing Data)', async () => {
      try {
        await monthlyMonetaryOfferService.create(admin, {
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Monthly Monetary Offer (as ADMIN)', async () => {
      const monthlyMonetaryOffer = await monthlyMonetaryOfferService.create(
        admin,
        {
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          field: field.id,
        },
      );

      expect(monthlyMonetaryOffer.month).toBe(month);
      expect(monthlyMonetaryOffer.year).toBe(year);
      expect(monthlyMonetaryOffer.openingBalance).toBe(openingBalance);
      expect(monthlyMonetaryOffer.offersValue).toBe(offersValue);
      expect(monthlyMonetaryOffer.offersDescription).toBe(offersDescription);
      expect(monthlyMonetaryOffer.spentValue).toBe(spentValue);
      expect(monthlyMonetaryOffer.spentDescription).toBe(spentDescription);
      expect(monthlyMonetaryOffer.field.id).toBe(field.id);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await monthlyMonetaryOfferService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

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

      const response = await monthlyMonetaryOfferService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
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

      const response = await monthlyMonetaryOfferService.findAll({
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
      const monthlyMonetaryOffer = await monthlyMonetaryOfferService.findOne(
        randomId,
      );

      expect(monthlyMonetaryOffer).toBeNull();
    });

    it('Should Return a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOfferCreated = await createMonthlyMonetaryOffer(
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field.id,
      );

      const monthlyMonetaryOffer = await monthlyMonetaryOfferService.findOne(
        monthlyMonetaryOfferCreated.id,
      );
      expect(monthlyMonetaryOffer.month).toBe(month);
      expect(monthlyMonetaryOffer.year).toBe(year);
      expect(monthlyMonetaryOffer.openingBalance).toBe(openingBalance);
      expect(monthlyMonetaryOffer.offersValue).toBe(offersValue);
      expect(monthlyMonetaryOffer.offersDescription).toBe(offersDescription);
      expect(monthlyMonetaryOffer.spentValue).toBe(spentValue);
      expect(monthlyMonetaryOffer.spentDescription).toBe(spentDescription);
    });
  });

  describe('update()', () => {
    it('Should Not Update a Monthly Monetary Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMonetaryOfferService.update(randomId, user, {
          offersDescription: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta monetária mensal', 'a'),
        );
      }
    });

    it('Should Not Update a Monthly Monetary Offer (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          differentField.id,
        );
        await monthlyMonetaryOfferService.update(
          monthlyMonetaryOffer.id,
          user,
          {
            offersDescription: 'lol',
          },
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Monthly Monetary Offer (as USER)', async () => {
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

      const monthlyMonetaryOfferUpdated =
        await monthlyMonetaryOfferService.update(
          monthlyMonetaryOffer.id,
          user,
          {
            year: newYear,
          },
        );
      expect(monthlyMonetaryOfferUpdated).toBeDefined();
      expect(monthlyMonetaryOfferUpdated.year).toBe(newYear);
    });

    it('Should Update a Monthly Monetary Offer (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
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

      const monthlyMonetaryOfferUpdated =
        await monthlyMonetaryOfferService.update(
          monthlyMonetaryOffer.id,
          admin,
          {
            year: newYear,
            field: differentField.id,
          },
        );
      expect(monthlyMonetaryOfferUpdated).toBeDefined();
      expect(monthlyMonetaryOfferUpdated.year).toBe(newYear);
      expect(monthlyMonetaryOfferUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Monetary Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMonetaryOfferService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta monetária mensal', 'a'),
        );
      }
    });

    it('Should Not Remove a Monthly Monetary Offer (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyMonetaryOffer = await createMonthlyMonetaryOffer(
          month,
          year,
          openingBalance,
          offersValue,
          offersDescription,
          spentValue,
          spentDescription,
          differentField.id,
        );
        await monthlyMonetaryOfferService.remove(monthlyMonetaryOffer.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Monthly Monetary Offer (as USER)', async () => {
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

      await monthlyMonetaryOfferService.remove(monthlyMonetaryOffer.id, user);
      const isMonthlyMonetaryOfferDeleted =
        await prisma.monthlyMonetaryOffer.findFirst({
          where: {
            id: monthlyMonetaryOffer.id,
            deleted: { lte: new Date() },
          },
        });
      expect(isMonthlyMonetaryOfferDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Monthly Monetary Offer (as ADMIN)', async () => {
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

      await monthlyMonetaryOfferService.remove(monthlyMonetaryOffer.id, admin);
      const isMonthlyMonetaryOfferDeleted =
        await prisma.monthlyMonetaryOffer.findFirst({
          where: {
            id: monthlyMonetaryOffer.id,
            deleted: { lte: new Date() },
          },
        });
      expect(isMonthlyMonetaryOfferDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
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

      await monthlyMonetaryOfferService.restore({
        ids: [monthlyMonetaryOffer.id],
      });
      const isMonthlyMonetaryOfferRestored =
        await prisma.monthlyMonetaryOffer.findFirst({
          where: {
            id: monthlyMonetaryOffer.id,
          },
        });

      expect(isMonthlyMonetaryOfferRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
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

      await monthlyMonetaryOfferService.hardRemove({
        ids: [monthlyMonetaryOffer.id],
      });
      const isMonthlyMonetaryOfferRemoved =
        await prisma.monthlyMonetaryOffer.findFirst({
          where: {
            id: monthlyMonetaryOffer.id,
            deleted: { not: new Date() },
          },
        });
      expect(isMonthlyMonetaryOfferRemoved).toBeNull();
    });
  });
});
