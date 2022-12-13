import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyFoodOffer, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { MonthlyFoodOfferService } from 'src/monthly-food-offer/monthly-food-offer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField, createUser } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import {
  CacheInterceptor,
  CacheModule,
  CacheStore,
  CACHE_MANAGER,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { AgendaModule } from 'src/agenda/agenda.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';
import { MonthlyFoodOfferModule } from 'src/monthly-food-offer/monthly-food-offer.module';

describe('Monthly Food Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyFoodOfferService: MonthlyFoodOfferService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const month = 1;
  const year = 2022;
  const food = 'alimento';
  const communityCollection = 1;
  const communityCollectionExternal = 1;
  const communityCollectionExtra = 1;
  const churchCollection = 1;
  const churchCollectionExternal = 1;
  const churchCollectionExtra = 1;

  const createMonthlyFoodOffer = async (
    month: number,
    year: number,
    food: string,
    communityCollection: number,
    communityCollectionExternal: number,
    communityCollectionExtra: number,
    churchCollection: number,
    churchCollectionExternal: number,
    churchCollectionExtra: number,
    field: string,
  ) =>
    await prisma.monthlyFoodOffer.create({
      data: {
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
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
        MonthlyFoodOfferModule,
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
    monthlyFoodOfferService = moduleRef.get(MonthlyFoodOfferService);

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
    it('Should Create a Monthly Food Offer (as USER)', async () => {
      const monthlyFoodOffer = await monthlyFoodOfferService.create(user, {
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
      });

      expect(monthlyFoodOffer.month).toBe(month);
      expect(monthlyFoodOffer.year).toBe(year);
      expect(monthlyFoodOffer.food).toBe(food);
      expect(monthlyFoodOffer.communityCollection).toBe(communityCollection);
      expect(monthlyFoodOffer.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(monthlyFoodOffer.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(monthlyFoodOffer.churchCollection).toBe(churchCollection);
      expect(monthlyFoodOffer.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(monthlyFoodOffer.churchCollectionExtra).toBe(
        churchCollectionExtra,
      );
    });

    it('Should Not Create aa Monthly Food Offer (as ADMIN && Missing Data)', async () => {
      try {
        await monthlyFoodOfferService.create(admin, {
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Monthly Food Offer (as ADMIN)', async () => {
      const monthlyFoodOffer = await monthlyFoodOfferService.create(admin, {
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field: field.id,
      });

      expect(monthlyFoodOffer.month).toBe(month);
      expect(monthlyFoodOffer.year).toBe(year);
      expect(monthlyFoodOffer.food).toBe(food);
      expect(monthlyFoodOffer.communityCollection).toBe(communityCollection);
      expect(monthlyFoodOffer.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(monthlyFoodOffer.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(monthlyFoodOffer.churchCollection).toBe(churchCollection);
      expect(monthlyFoodOffer.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(monthlyFoodOffer.churchCollectionExtra).toBe(
        churchCollectionExtra,
      );
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await monthlyFoodOfferService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Monthly Food Offer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const monthlyFoodOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              food: `Alimento ${i}`,
              communityCollection,
              communityCollectionExternal,
              communityCollectionExtra,
              churchCollection,
              churchCollectionExternal,
              churchCollectionExtra,
              fieldId: field.id,
            } as MonthlyFoodOffer),
        );
      await prisma.monthlyFoodOffer.createMany({
        data: monthlyFoodOffersToCreate,
      });

      const response = await monthlyFoodOfferService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Monthly Food Offer List With ${randomN} Items`, async () => {
      const monthlyFoodOffersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              month,
              year,
              food: `Alimento ${i}`,
              communityCollection,
              communityCollectionExternal,
              communityCollectionExtra,
              churchCollection,
              churchCollectionExternal,
              churchCollectionExtra,
              fieldId: field.id,
            } as MonthlyFoodOffer),
        );
      await prisma.monthlyFoodOffer.createMany({
        data: monthlyFoodOffersToCreate,
      });

      const response = await monthlyFoodOfferService.findAll({
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
      const monthlyFoodOffer = await monthlyFoodOfferService.findOne(randomId);

      expect(monthlyFoodOffer).toBeNull();
    });

    it('Should Return a Monthly Food Offer', async () => {
      const monthlyFoodOfferCreated = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );

      const monthlyFoodOffer = await monthlyFoodOfferService.findOne(
        monthlyFoodOfferCreated.id,
      );
      expect(monthlyFoodOffer.month).toBe(month);
      expect(monthlyFoodOffer.year).toBe(year);
      expect(monthlyFoodOffer.food).toBe(food);
      expect(monthlyFoodOffer.communityCollection).toBe(communityCollection);
      expect(monthlyFoodOffer.communityCollectionExternal).toBe(
        communityCollectionExternal,
      );
      expect(monthlyFoodOffer.communityCollectionExtra).toBe(
        communityCollectionExtra,
      );
      expect(monthlyFoodOffer.churchCollection).toBe(churchCollection);
      expect(monthlyFoodOffer.churchCollectionExternal).toBe(
        churchCollectionExternal,
      );
      expect(monthlyFoodOffer.churchCollectionExtra).toBe(
        churchCollectionExtra,
      );
    });
  });

  describe('update()', () => {
    it('Should Not Update a Monthly Food Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyFoodOfferService.update(randomId, user, { food: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta alimentícia mensal', 'a'),
        );
      }
    });

    it('Should Not Update a Monthly Food Offer (as USER && Differente Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyFoodOffer = await createMonthlyFoodOffer(
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
          differentField.id,
        );
        await monthlyFoodOfferService.update(monthlyFoodOffer.id, user, {
          food: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Monthly Food Offer (as USER)', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      const newFood = 'Alimento 2';

      const monthlyFoodOfferUpdated = await monthlyFoodOfferService.update(
        monthlyFoodOffer.id,
        user,
        {
          food: newFood,
        },
      );
      expect(monthlyFoodOfferUpdated).toBeDefined();
      expect(monthlyFoodOfferUpdated.food).toBe(newFood);
    });

    it('Should Update a Monthly Food Offer (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      const newFood = 'Alimento 2';

      const monthlyFoodOfferUpdated = await monthlyFoodOfferService.update(
        monthlyFoodOffer.id,
        user,
        {
          food: newFood,
          field: differentField.id,
        },
      );
      expect(monthlyFoodOfferUpdated).toBeDefined();
      expect(monthlyFoodOfferUpdated.food).toBe(newFood);
      expect(monthlyFoodOfferUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Food Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyFoodOfferService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta alimentícia mensal', 'a'),
        );
      }
    });

    it('Should Not Remove a Monthly Food Offer (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const monthlyFoodOffer = await createMonthlyFoodOffer(
          month,
          year,
          food,
          communityCollection,
          communityCollectionExternal,
          communityCollectionExtra,
          churchCollection,
          churchCollectionExternal,
          churchCollectionExtra,
          differentField.id,
        );
        await monthlyFoodOfferService.remove(monthlyFoodOffer.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Monthly Food Offer (as USER)', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );

      await monthlyFoodOfferService.remove(monthlyFoodOffer.id, user);
      const isMonthlyFoodOfferDeleted = await prisma.monthlyFoodOffer.findFirst(
        {
          where: {
            id: monthlyFoodOffer.id,
            deleted: { lte: new Date() },
          },
        },
      );
      expect(isMonthlyFoodOfferDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Monthly Food Offer (as ADMIN)', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );

      await monthlyFoodOfferService.remove(monthlyFoodOffer.id, admin);
      const isMonthlyFoodOfferDeleted = await prisma.monthlyFoodOffer.findFirst(
        {
          where: {
            id: monthlyFoodOffer.id,
            deleted: { lte: new Date() },
          },
        },
      );
      expect(isMonthlyFoodOfferDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await monthlyFoodOfferService.restore({ ids: [monthlyFoodOffer.id] });
      const isMonthlyFoodOfferRestored =
        await prisma.monthlyFoodOffer.findFirst({
          where: {
            id: monthlyFoodOffer.id,
          },
        });

      expect(isMonthlyFoodOfferRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await createMonthlyFoodOffer(
        month,
        year,
        food,
        communityCollection,
        communityCollectionExternal,
        communityCollectionExtra,
        churchCollection,
        churchCollectionExternal,
        churchCollectionExtra,
        field.id,
      );
      await prisma.monthlyFoodOffer.delete({
        where: { id: monthlyFoodOffer.id },
      });

      await monthlyFoodOfferService.hardRemove({ ids: [monthlyFoodOffer.id] });
      const isMonthlyFoodOfferRemoved = await prisma.monthlyFoodOffer.findFirst(
        {
          where: {
            id: monthlyFoodOffer.id,
            deleted: { not: new Date() },
          },
        },
      );
      expect(isMonthlyFoodOfferRemoved).toBeNull();
    });
  });
});
