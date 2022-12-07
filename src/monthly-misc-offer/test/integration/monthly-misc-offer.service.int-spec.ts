import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, MonthlyMiscOffer } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { MonthlyMiscOfferService } from 'src/monthly-misc-offer/monthly-misc-offer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Monthly Misc Offer Service Integration', () => {
  let prisma: PrismaService;
  let monthlyMiscOfferService: MonthlyMiscOfferService;
  let field: Field;

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
      imports: [AppModule],
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
  });

  describe('create()', () => {
    it('Should Create a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await monthlyMiscOfferService.create({
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
        await monthlyMiscOfferService.update(randomId, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
        );
      }
    });

    it('Should Update a Monthly Misc Offer', async () => {
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
        {
          title: newTitle,
        },
      );
      expect(monthlyMiscOfferUpdated).toBeDefined();
      expect(monthlyMiscOfferUpdated.title).toBe(newTitle);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Monthly Misc Offer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await monthlyMiscOfferService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
        );
      }
    });

    it('Should Remove a Monthly Misc Offer', async () => {
      const monthlyMiscOffer = await createMonthlyMiscOffer(
        month,
        year,
        title,
        description,
        destination,
        field.id,
      );

      await monthlyMiscOfferService.remove(monthlyMiscOffer.id);
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
