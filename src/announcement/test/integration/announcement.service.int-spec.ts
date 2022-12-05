import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Announcement, Field } from '@prisma/client';
import { AnnouncementService } from 'src/announcement/announcement.service';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Announcement Service Integration', () => {
  let prisma: PrismaService;
  let announcementService: AnnouncementService;
  let field: Field;

  const title = 'Título';
  const message = 'Mensagem';
  const date = new Date('2022-02-02');

  const createAnnouncement = async (
    title: string,
    message: string,
    date: Date,
    field: string,
  ) =>
    await prisma.announcement.create({
      data: {
        title,
        message,
        date,
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
    announcementService = moduleRef.get(AnnouncementService);

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
    it('Should Create an Announcement', async () => {
      const announcement = await announcementService.create({
        title,
        message,
        date,
        field: field.id,
      });

      expect(announcement.title).toBe(title);
      expect(announcement.message).toBe(message);
      expect(announcement.date).toStrictEqual(date);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await announcementService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an Announcement List With ${ITEMS_PER_PAGE} Items`, async () => {
      const announcementsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message,
              date,
              fieldId: field.id,
            } as Announcement),
        );
      await prisma.announcement.createMany({
        data: announcementsToCreate,
      });

      const response = await announcementService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Announcement List With ${randomN} Items`, async () => {
      const announcementsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message,
              date,
              fieldId: field.id,
            } as Announcement),
        );
      await prisma.announcement.createMany({
        data: announcementsToCreate,
      });

      const response = await announcementService.findAll({
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
      const announcement = await announcementService.findOne(randomId);

      expect(announcement).toBeNull();
    });

    it('Should Return an Announcement', async () => {
      const announcementCreated = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      const announcement = await announcementService.findOne(
        announcementCreated.id,
      );
      expect(announcement.title).toBe(title);
      expect(announcement.message).toBe(message);
      expect(announcement.date).toStrictEqual(date);
    });
  });

  describe('update()', () => {
    it('Should Not Update an Announcement (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await announcementService.update(randomId, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
        );
      }
    });

    it('Should Update an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      const newTitle = 'Novo Título';

      const announcementUpdated = await announcementService.update(
        announcement.id,
        {
          title: newTitle,
        },
      );
      expect(announcementUpdated).toBeDefined();
      expect(announcementUpdated.title).toBe(newTitle);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Announcement (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await announcementService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
        );
      }
    });

    it('Should Remove an Assisted family', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      await announcementService.remove(announcement.id);
      const isAnnouncementDeleted = await prisma.announcement.findFirst({
        where: {
          id: announcement.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isAnnouncementDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await announcementService.restore({ ids: [announcement.id] });
      const isAnnouncementRestored = await prisma.announcement.findFirst({
        where: {
          id: announcement.id,
        },
      });

      expect(isAnnouncementRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove an Announcement', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      await prisma.announcement.delete({ where: { id: announcement.id } });

      await announcementService.hardRemove({ ids: [announcement.id] });
      const isAnnouncementRemoved = await prisma.announcement.findFirst({
        where: {
          id: announcement.id,
          deleted: { not: new Date() },
        },
      });
      expect(isAnnouncementRemoved).toBeNull();
    });
  });
});
