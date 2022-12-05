import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Report } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportService } from 'src/report/report.service';
import { createField } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';

describe('Report Service Integration', () => {
  let prisma: PrismaService;
  let reportService: ReportService;
  let field: Field;

  const title = 'Título';
  const shortDescription = 'Descrição';
  const date = new Date('2022-02-02');

  const createReport = async (
    title: string,
    shortDescription: string,
    date: Date,
    field: string,
  ) =>
    await prisma.report.create({
      data: {
        title,
        shortDescription,
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
    reportService = moduleRef.get(ReportService);

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
    it('Should Create a Report', async () => {
      const report = await reportService.create({
        title,
        shortDescription,
        date,
        field: field.id,
      });

      expect(report.title).toBe(title);
      expect(report.shortDescription).toBe(shortDescription);
      expect(report.date).toStrictEqual(date);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await reportService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Report List With ${ITEMS_PER_PAGE} Items`, async () => {
      const reportsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              shortDescription,
              date,
              fieldId: field.id,
            } as Report),
        );
      await prisma.report.createMany({
        data: reportsToCreate,
      });

      const response = await reportService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Report List With ${randomN} Items`, async () => {
      const reportsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              shortDescription,
              date,
              fieldId: field.id,
            } as Report),
        );
      await prisma.report.createMany({
        data: reportsToCreate,
      });

      const response = await reportService.findAll({
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
      const report = await reportService.findOne(randomId);

      expect(report).toBeNull();
    });

    it('Should Return a Report', async () => {
      const reportCreated = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );

      const report = await reportService.findOne(reportCreated.id);
      expect(report).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update a Report (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await reportService.update(randomId, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
        );
      }
    });

    it('Should Update a Report', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      const newTitle = 'Abreu';

      const reportUpdated = await reportService.update(report.id, {
        title: newTitle,
      });
      expect(reportUpdated).toBeDefined();
      expect(reportUpdated.title).toBe(newTitle);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Report (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await reportService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
        );
      }
    });

    it('Should Remove a Report', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      await reportService.remove(report.id);

      const isReportDeleted = await prisma.report.findFirst({
        where: {
          id: report.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isReportDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore a Report', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      await prisma.report.delete({ where: { id: report.id } });

      await reportService.restore({ ids: [report.id] });
      const isReportRestored = await prisma.report.findFirst({
        where: {
          id: report.id,
        },
      });

      expect(isReportRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove a Report', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      await prisma.report.delete({ where: { id: report.id } });

      await reportService.hardRemove({ ids: [report.id] });
      const isReportRemoved = await prisma.report.findFirst({
        where: {
          id: report.id,
          deleted: { not: new Date() },
        },
      });
      expect(isReportRemoved).toBeNull();
    });
  });
});
