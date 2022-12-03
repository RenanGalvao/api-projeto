import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AssistedFamily, AssistedFamilyGroup, Field } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { AssistedFamilyService } from 'src/assisted-family/assisted-family.service';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Assisted Family Service Integration', () => {
  let prisma: PrismaService;
  let assistedFamilyService: AssistedFamilyService;

  let field: Field;

  const representative = 'Mário';
  const period = 'Período';
  const group = AssistedFamilyGroup.AE;

  const createAssistedFamily = async (
    representative: string,
    period: string,
    group: AssistedFamilyGroup,
    field: string,
  ) =>
    await prisma.assistedFamily.create({
      data: {
        representative,
        period,
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

    prisma = moduleRef.get(PrismaService);
    assistedFamilyService = moduleRef.get(AssistedFamilyService);

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
    it('Should Create an Assisted Family', async () => {
      const assistedFamily = await assistedFamilyService.create({
        representative,
        period,
        group,
        field: field.id,
      });

      expect(assistedFamily.representative).toBe(representative);
      expect(assistedFamily.period).toBe(period);
      expect(assistedFamily.group).toBe(group);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await assistedFamilyService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an Assisted Family List With ${ITEMS_PER_PAGE} Items`, async () => {
      const assistedFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              period: 'Período',
              group,
              fieldId: field.id,
            } as AssistedFamily),
        );
      await prisma.assistedFamily.createMany({
        data: assistedFamiliesToCreate,
      });

      const response = await assistedFamilyService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Assisted Family List With ${randomN} Items`, async () => {
      const assistedFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              period: 'Período',
              group,
              fieldId: field.id,
            } as AssistedFamily),
        );
      await prisma.assistedFamily.createMany({
        data: assistedFamiliesToCreate,
      });

      const response = await assistedFamilyService.findAll({
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
      const assistedFamily = await assistedFamilyService.findOne(randomId);

      expect(assistedFamily).toBeNull();
    });

    it('Should Return an Assisted Family', async () => {
      const assistedFamilyCreated = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );

      const assistedFamily = await assistedFamilyService.findOne(
        assistedFamilyCreated.id,
      );
      expect(assistedFamily).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update an Assisted Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await assistedFamilyService.update(randomId, { representative: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
        );
      }
    });

    it('Should Update an Assisted Family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const assistedFamilyUpdated = await assistedFamilyService.update(
        assistedFamily.id,
        {
          representative: newRepresentative,
        },
      );
      expect(assistedFamilyUpdated).toBeDefined();
      expect(assistedFamilyUpdated.representative).toBe(newRepresentative);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Assisted Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await assistedFamilyService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
        );
      }
    });

    it('Should Remove an Assisted family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );

      await assistedFamilyService.remove(assistedFamily.id);
      const isAssistedFamilyDeleted = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isAssistedFamilyDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Assisted Family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      await prisma.assistedFamily.delete({ where: { id: assistedFamily.id } });

      await assistedFamilyService.restore({ ids: [assistedFamily.id] });
      const isAssistedFamilyRestored = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
        },
      });

      expect(isAssistedFamilyRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove an Assisted Family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      await prisma.assistedFamily.delete({ where: { id: assistedFamily.id } });

      await assistedFamilyService.hardRemove({ ids: [assistedFamily.id] });
      const isAssistedFamilyRemoved = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
          deleted: { not: new Date() },
        },
      });
      expect(isAssistedFamilyRemoved).toBeNull();
    });
  });
});
