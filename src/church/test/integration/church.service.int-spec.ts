import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Church, Field } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ChurchService } from 'src/church/church.service';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Church Service Integration', () => {
  let prisma: PrismaService;
  let churchService: ChurchService;
  let field: Field;

  const name = 'Igreja';
  const description = 'Descrição';
  const image = 'imagem.webp';

  const createChurch = async (
    name: string,
    description: string,
    image: string,
    field: string,
  ) =>
    await prisma.church.create({
      data: {
        name,
        description,
        image,
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
    churchService = moduleRef.get(ChurchService);

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
    it('Should Create a Church', async () => {
      const church = await churchService.create({
        name,
        description,
        image,
        field: field.id,
      });

      expect(church.name).toBe(name);
      expect(church.description).toBe(description);
      expect(church.image).toBe(image);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await churchService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Church List With ${ITEMS_PER_PAGE} Items`, async () => {
      const churchesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `João ${i}`,
              description,
              image: `imagem-${i}.webp`,
              fieldId: field.id,
            } as Church),
        );
      await prisma.church.createMany({
        data: churchesToCreate,
      });

      const response = await churchService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Church List With ${randomN} Items`, async () => {
      const churchesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: `João ${i}`,
              description,
              image: `imagem-${i}.webp`,
              fieldId: field.id,
            } as Church),
        );
      await prisma.church.createMany({
        data: churchesToCreate,
      });

      const response = await churchService.findAll({
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
      const church = await churchService.findOne(randomId);

      expect(church).toBeNull();
    });

    it('Should Return a Church', async () => {
      const churchCreated = await createChurch(
        name,
        description,
        image,
        field.id,
      );

      const church = await churchService.findOne(churchCreated.id);
      expect(church).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update a Church (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await churchService.update(randomId, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
        );
      }
    });

    it('Should Update a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      const newName = 'Abreu';

      const churchUpdated = await churchService.update(church.id, {
        name: newName,
      });
      expect(churchUpdated).toBeDefined();
      expect(churchUpdated.name).toBe(newName);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Church (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await churchService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
        );
      }
    });

    it('Should Remove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);

      await churchService.remove(church.id);
      const ischurchDeleted = await prisma.church.findFirst({
        where: {
          id: church.id,
          deleted: { lte: new Date() },
        },
      });
      expect(ischurchDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await churchService.restore({ ids: [church.id] });
      const ischurchRestored = await prisma.church.findFirst({
        where: {
          id: church.id,
        },
      });

      expect(ischurchRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Church', async () => {
      const church = await createChurch(name, description, image, field.id);
      await prisma.church.delete({ where: { id: church.id } });

      await churchService.hardRemove({ ids: [church.id] });
      const ischurchRemoved = await prisma.church.findFirst({
        where: {
          id: church.id,
          deleted: { not: new Date() },
        },
      });
      expect(ischurchRemoved).toBeNull();
    });
  });
});
