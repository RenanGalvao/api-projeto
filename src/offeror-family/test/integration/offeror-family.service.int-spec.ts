import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, OfferorFamily, OfferorFamilyGroup } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { OfferorFamilyService } from 'src/offeror-family/offeror-family.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Offeror Family Service Integration', () => {
  let prisma: PrismaService;
  let offerorFamilyService: OfferorFamilyService;
  let field: Field;

  const representative = 'Sigma';
  const commitment = 'all';
  const group = OfferorFamilyGroup.CHURCH;

  const createOfferorFamily = async (
    representative: string,
    commitment: string,
    group: OfferorFamilyGroup,
    field: string,
  ) =>
    await prisma.offerorFamily.create({
      data: {
        representative,
        commitment,
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
    offerorFamilyService = moduleRef.get(OfferorFamilyService);

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
    it('Should Create an Offeror Family', async () => {
      const offerorFamily = await offerorFamilyService.create({
        representative,
        commitment,
        group,
        field: field.id,
      });

      expect(offerorFamily.representative).toBe(representative);
      expect(offerorFamily.commitment).toBe(commitment);
      expect(offerorFamily.group).toBe(group);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await offerorFamilyService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an Offeror Family List With ${ITEMS_PER_PAGE} Items`, async () => {
      const offerorFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              commitment,
              group,
              fieldId: field.id,
            } as OfferorFamily),
        );
      await prisma.offerorFamily.createMany({
        data: offerorFamiliesToCreate,
      });

      const response = await offerorFamilyService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Offeror Family List With ${randomN} Items`, async () => {
      const offerorFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              commitment,
              group,
              fieldId: field.id,
            } as OfferorFamily),
        );
      await prisma.offerorFamily.createMany({
        data: offerorFamiliesToCreate,
      });

      const response = await offerorFamilyService.findAll({
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
      const offerorFamily = await offerorFamilyService.findOne(randomId);

      expect(offerorFamily).toBeNull();
    });

    it('Should Return an Offeror Family', async () => {
      const offerorFamilyCreated = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );

      const offerorFamily = await offerorFamilyService.findOne(
        offerorFamilyCreated.id,
      );
      expect(offerorFamily).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update an Offeror Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await offerorFamilyService.update(randomId, { representative: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
        );
      }
    });

    it('Should Update an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const offerorFamilyUpdated = await offerorFamilyService.update(
        offerorFamily.id,
        {
          representative: newRepresentative,
        },
      );
      expect(offerorFamilyUpdated).toBeDefined();
      expect(offerorFamilyUpdated.representative).toBe(newRepresentative);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Offeror Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await offerorFamilyService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
        );
      }
    });

    it('Should Remove an Offeror family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );

      await offerorFamilyService.remove(offerorFamily.id);
      const isOfferorFamilyDeleted = await prisma.offerorFamily.findFirst({
        where: {
          id: offerorFamily.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isOfferorFamilyDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await offerorFamilyService.restore({ ids: [offerorFamily.id] });
      const isOfferorFamilyRestored = await prisma.offerorFamily.findFirst({
        where: {
          id: offerorFamily.id,
        },
      });

      expect(isOfferorFamilyRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove an Offeror Family', async () => {
      const offerorFamily = await createOfferorFamily(
        representative,
        commitment,
        group,
        field.id,
      );
      await prisma.offerorFamily.delete({ where: { id: offerorFamily.id } });

      await offerorFamilyService.hardRemove({ ids: [offerorFamily.id] });
      const isOfferorFamilyRemoved = await prisma.offerorFamily.findFirst({
        where: {
          id: offerorFamily.id,
          deleted: { not: new Date() },
        },
      });
      expect(isOfferorFamilyRemoved).toBeNull();
    });
  });
});
