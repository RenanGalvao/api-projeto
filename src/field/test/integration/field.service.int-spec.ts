import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { FieldService } from 'src/field/field.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Field Service Integration', () => {
  let prisma: PrismaService;
  let fieldService: FieldService;

  const continent = 'América';
  const country = 'Brasil';
  const state = 'Rio de Janeiro';
  const abbreviation = 'AMEBRRJ01';
  const designation = 'Designação';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    fieldService = moduleRef.get(FieldService);

    // enable soft delete
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
  });

  describe('create()', () => {
    it('Should Create a Field', async () => {
      const field = await fieldService.create({
        continent,
        country,
        state,
        abbreviation,
        designation,
      });

      expect(field.continent).toBe(continent);
      expect(field.country).toBe(country);
      expect(field.state).toBe(state);
      expect(field.abbreviation).toBe(abbreviation);
      expect(field.designation).toBe(designation);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await fieldService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Field List With ${ITEMS_PER_PAGE} Items`, async () => {
      const fieldsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              continent,
              country,
              state,
              abbreviation: `AMEBRRJ${i}`,
              designation,
            } as Field),
        );
      await prisma.field.createMany({
        data: fieldsToCreate,
      });

      const response = await fieldService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Work List With ${randomN} Items`, async () => {
      const fieldsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              continent,
              country,
              state,
              abbreviation: `AMEBRRJ${i}`,
              designation,
            } as Field),
        );
      await prisma.field.createMany({
        data: fieldsToCreate,
      });

      const response = await fieldService.findAll({
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
      const field = await fieldService.findOne(randomId);

      expect(field).toBeNull();
    });

    it('Should Return a Field', async () => {
      const fieldCreated = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );

      const field = await fieldService.findOne(fieldCreated.id);
      expect(field.continent).toBe(continent);
      expect(field.country).toBe(country);
      expect(field.state).toBe(state);
      expect(field.abbreviation).toBe(abbreviation);
      expect(field.designation).toBe(designation);
    });
  });

  describe('update()', () => {
    it('Should Not Update Field (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await fieldService.update(randomId, { continent: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('campo', 'o'),
        );
      }
    });

    it('Should Update Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      const newContinent = 'Oceania';

      const fieldUpdated = await fieldService.update(field.id, {
        continent: newContinent,
      });
      expect(fieldUpdated.continent).toBe(newContinent);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove Field (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await fieldService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('campo', 'o'),
        );
      }
    });

    it('Should Remove Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await fieldService.remove(field.id);

      const isFieldDeleted = await prisma.field.findFirst({
        where: {
          id: field.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isFieldDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await fieldService.restore({ ids: [field.id] });
      const isFieldRestored = await prisma.field.findFirst({
        where: {
          id: field.id,
        },
      });
      expect(isFieldRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should Hard Remove Field', async () => {
      const field = await createField(
        prisma,
        continent,
        country,
        state,
        abbreviation,
        designation,
      );
      await prisma.field.delete({ where: { id: field.id } });

      await fieldService.hardRemove({ ids: [field.id] });
      const isFieldRemoved = await prisma.field.findFirst({
        where: {
          id: field.id,
          deleted: { not: new Date() },
        },
      });
      expect(isFieldRemoved).toBeNull();
    });
  });
});
