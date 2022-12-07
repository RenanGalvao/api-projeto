import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyFoodOffer } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { MonthlyFoodOfferService } from 'src/monthly-food-offer/monthly-food-offer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Monthly Food Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyFoodOfferService: MonthlyFoodOfferService;
  let field: Field;

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
      imports: [AppModule],
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
  });

  describe('create()', () => {
    it('Should Create a Monthly Food Offer', async () => {
      const monthlyFoodOffer = await monthlyFoodOfferService.create({
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
        await monthlyFoodOfferService.update(randomId, { food: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta alimentícia mensal', 'a'),
        );
      }
    });

    it('Should Update a Monthly Food Offer', async () => {
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
        {
          food: newFood,
        },
      );
      expect(monthlyFoodOfferUpdated).toBeDefined();
      expect(monthlyFoodOfferUpdated.food).toBe(newFood);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Food Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyFoodOfferService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta alimentícia mensal', 'a'),
        );
      }
    });

    it('Should Remove a Monthly Food Offer', async () => {
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

      await monthlyFoodOfferService.remove(monthlyFoodOffer.id);
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
