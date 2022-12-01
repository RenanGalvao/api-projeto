import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Volunteer } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { VolunteerService } from 'src/volunteer/volunteer.service';
import { v4 as uuidv4 } from 'uuid';

describe('Volunteer Service Integration', () => {
  let prisma: PrismaService;
  let volunteerService: VolunteerService;

  let field: Field;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    volunteerService = moduleRef.get(VolunteerService);

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
    const firstName = 'João';
    const joinedDate = new Date('2022-01-01');

    it('Should Create a Volunteer', async () => {
      const volunteer = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });

      expect(volunteer.firstName).toBe(firstName);
      expect(volunteer.joinedDate).toStrictEqual(joinedDate);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await volunteerService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Volunteer List With ${ITEMS_PER_PAGE} Items`, async () => {
      const volunteersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              joinedDate: new Date('2022-01-03'),
              fieldId: field.id,
            } as Volunteer),
        );
      await prisma.volunteer.createMany({
        data: volunteersToCreate,
      });

      const response = await volunteerService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Work List With ${randomN} Items`, async () => {
      const volunteersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `João ${i}`,
              joinedDate: new Date('2022-01-03'),
              fieldId: field.id,
            } as Volunteer),
        );
      await prisma.volunteer.createMany({
        data: volunteersToCreate,
      });

      const response = await volunteerService.findAll({
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
      const volunteer = await volunteerService.findOne(randomId);

      expect(volunteer).toBeNull();
    });

    it('Should Return a Volunteer', async () => {
      const firstName = 'João';
      const joinedDate = new Date('2022-01-01');
      const volunteerCreated = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });

      const volunteer = await volunteerService.findOne(volunteerCreated.id);
      expect(volunteer).toBeDefined();
    });
  });

  describe('update()', () => {
    const firstName = 'João';
    const joinedDate = new Date('2022-01-01');

    it('Should Not Update Volunteer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await volunteerService.update(randomId, { lastName: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('voluntário', 'o'),
        );
      }
    });

    it('Should Update a Volunteer', async () => {
      const newFirstName = 'Phelp';
      const volunteer = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });

      const volunteerUpdated = await volunteerService.update(volunteer.id, {
        firstName: newFirstName,
      });
      expect(volunteerUpdated).toBeDefined();
      expect(volunteerUpdated.firstName).toBe(newFirstName);
    });
  });

  describe('remove()', () => {
    const firstName = 'João';
    const joinedDate = new Date('2022-01-01');

    it('Should Not Remove Volunteer (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await volunteerService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('voluntário', 'o'),
        );
      }
    });

    it('Should Remove Volunteer', async () => {
      const volunteer = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });

      await volunteerService.remove(volunteer.id);
      const isWorkDeleted = await prisma.volunteer.findFirst({
        where: {
          id: volunteer.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isWorkDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    const firstName = 'João';
    const joinedDate = new Date('2022-01-01');

    it('Should Restore Volunteer', async () => {
      const volunteer = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });
      await volunteerService.remove(volunteer.id);

      await volunteerService.restore({ ids: [volunteer.id] });
      const isVolunteerRestored = await prisma.volunteer.findFirst({
        where: {
          id: volunteer.id,
        },
      });

      expect(isVolunteerRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    const firstName = 'João';
    const joinedDate = new Date('2022-01-01');

    it('Should Hard Remove Entry', async () => {
      const volunteer = await volunteerService.create({
        firstName,
        joinedDate,
        field: field.id,
      });
      await volunteerService.remove(volunteer.id);

      await volunteerService.hardRemove({ ids: [volunteer.id] });
      const isVolunteerRemoved = await prisma.volunteer.findFirst({
        where: {
          id: volunteer.id,
          deleted: { not: new Date() },
        },
      });
      expect(isVolunteerRemoved).toBeNull();
    });
  });
});
