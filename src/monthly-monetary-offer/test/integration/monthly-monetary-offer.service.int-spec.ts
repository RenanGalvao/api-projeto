import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyMonetaryOffer } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { MonthlyMonetaryOfferService } from 'src/monthly-monetary-offer/monthly-monetary-offer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Monthly Monetary Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyMonetaryOfferService: MonthlyMonetaryOfferService;
  let field: Field;

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
      imports: [AppModule],
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
  });

  describe('create()', () => {
    it('Should Create a Monthly Monetary Offer', async () => {
      const monthlyMonetaryOffer = await monthlyMonetaryOfferService.create({
        month,
        year,
        openingBalance,
        offersValue,
        offersDescription,
        spentValue,
        spentDescription,
        field: field.id,
      });

      expect(monthlyMonetaryOffer.month).toBe(month);
      expect(monthlyMonetaryOffer.year).toBe(year);
      expect(monthlyMonetaryOffer.openingBalance).toBe(openingBalance);
      expect(monthlyMonetaryOffer.offersValue).toBe(offersValue);
      expect(monthlyMonetaryOffer.offersDescription).toBe(offersDescription);
      expect(monthlyMonetaryOffer.spentValue).toBe(spentValue);
      expect(monthlyMonetaryOffer.spentDescription).toBe(spentDescription);
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
        await monthlyMonetaryOfferService.update(randomId, {
          offersDescription: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta monetária mensal', 'a'),
        );
      }
    });

    it('Should Update a Monthly Monetary Offer', async () => {
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
        await monthlyMonetaryOfferService.update(monthlyMonetaryOffer.id, {
          year: newYear,
        });
      expect(monthlyMonetaryOfferUpdated).toBeDefined();
      expect(monthlyMonetaryOfferUpdated.year).toBe(newYear);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Monetary Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMonetaryOfferService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta monetária mensal', 'a'),
        );
      }
    });

    it('Should Remove a Monthly Monetary Offer', async () => {
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

      await monthlyMonetaryOfferService.remove(monthlyMonetaryOffer.id);
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
