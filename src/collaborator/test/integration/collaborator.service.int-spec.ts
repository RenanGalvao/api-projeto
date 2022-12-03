import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Collaborator, Field } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Collaborator Service Integration', () => {
  let prisma: PrismaService;
  let collaboratorService: CollaboratorService;
  let field: Field;

  const firstName = 'João';
  const description = 'Descrição';

  const createCollaborator = async (
    firstName: string,
    description: string,
    field: string,
  ) =>
    await prisma.collaborator.create({
      data: {
        firstName,
        description,
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
    collaboratorService = moduleRef.get(CollaboratorService);

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
    it('Should Create a Collaborator', async () => {
      const collaborator = await collaboratorService.create({
        firstName,
        description,
        field: field.id,
      });

      expect(collaborator.firstName).toBe(firstName);
      expect(collaborator.description).toBe(description);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await collaboratorService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Collaborator List With ${ITEMS_PER_PAGE} Items`, async () => {
      const collaboratorsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              description,
              fieldId: field.id,
            } as Collaborator),
        );
      await prisma.collaborator.createMany({
        data: collaboratorsToCreate,
      });

      const response = await collaboratorService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Collaborator List With ${randomN} Items`, async () => {
      const collaboratorsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              description,
              fieldId: field.id,
            } as Collaborator),
        );
      await prisma.collaborator.createMany({
        data: collaboratorsToCreate,
      });

      const response = await collaboratorService.findAll({
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
      const collaborator = await collaboratorService.findOne(randomId);

      expect(collaborator).toBeNull();
    });

    it('Should Return a Collaborator', async () => {
      const collaboratorCreated = await createCollaborator(
        firstName,
        description,
        field.id,
      );

      const collaborator = await collaboratorService.findOne(
        collaboratorCreated.id,
      );
      expect(collaborator).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update a Collaborator (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await collaboratorService.update(randomId, { firstName: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
        );
      }
    });

    it('Should Update a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      const newFirstName = 'Abreu';

      const collaboratorUpdated = await collaboratorService.update(
        collaborator.id,
        {
          firstName: newFirstName,
        },
      );
      expect(collaboratorUpdated).toBeDefined();
      expect(collaboratorUpdated.firstName).toBe(newFirstName);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Collaborator (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await collaboratorService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
        );
      }
    });

    it('Should Remove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await collaboratorService.remove(collaborator.id);

      const isCollaboratorDeleted = await prisma.collaborator.findFirst({
        where: {
          id: collaborator.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isCollaboratorDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await collaboratorService.restore({ ids: [collaborator.id] });
      const isCollaboratorRestored = await prisma.collaborator.findFirst({
        where: {
          id: collaborator.id,
        },
      });

      expect(isCollaboratorRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Collaborator', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await prisma.collaborator.delete({ where: { id: collaborator.id } });

      await collaboratorService.hardRemove({ ids: [collaborator.id] });
      const isCollaboratorRemoved = await prisma.collaborator.findFirst({
        where: {
          id: collaborator.id,
          deleted: { not: new Date() },
        },
      });
      expect(isCollaboratorRemoved).toBeNull();
    });
  });
});
