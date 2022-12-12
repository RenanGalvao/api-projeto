import {
  BadRequestException,
  CacheInterceptor,
  CacheModule,
  CacheStore,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Report, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportService } from 'src/report/report.service';
import { createField, createUser } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { ReportModule } from 'src/report/report.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';
import { redisStore } from 'cache-manager-redis-store';

describe('Report Service Integration', () => {
  let prisma: PrismaService;
  let reportService: ReportService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        // https://github.com/dabroek/node-cache-manager-redis-store/issues/53
        CacheModule.registerAsync({
          isGlobal: true,
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => ({
            store: (await redisStore({
              url: config.get('REDIS_URL'),
            })) as unknown as CacheStore,
            ttl: config.get('redis.ttl'),
            max: config.get('redis.max'),
            isCacheableValue: (val: any) => val !== undefined && val !== null,
          }),
        }),

        // Basic Routes
        AuthModule,
        PrismaModule,
        UserModule,

        // Specific
        FieldModule,
        ReportModule,
      ],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: CacheInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: CacheControlInterceptor,
        },
      ],
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

    user = await createUser(
      prisma,
      'João',
      'volunteer@email.com',
      hashedPassword,
      Role.VOLUNTEER,
      field.id,
    );

    admin = await createUser(
      prisma,
      'admin',
      'sigma@email.com',
      hashedPassword,
      Role.ADMIN,
    );
  });

  describe('create()', () => {
    it('Should Create a Report (as USER)', async () => {
      const report = await reportService.create(user, {
        title,
        shortDescription,
        date,
      });

      expect(report.title).toBe(title);
      expect(report.shortDescription).toBe(shortDescription);
      expect(report.date).toStrictEqual(date);
      expect(report.field.id).toBe(field.id);
    });

    it('Should NOT Create a Report (as ADMIN && Missing Data)', async () => {
      try {
        await reportService.create(admin, {
          title,
          shortDescription,
          date,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Report (as ADMIN)', async () => {
      const report = await reportService.create(admin, {
        title,
        shortDescription,
        date,
        field: field.id,
      });

      expect(report.title).toBe(title);
      expect(report.shortDescription).toBe(shortDescription);
      expect(report.date).toStrictEqual(date);
      expect(report.field.id).toBe(field.id);
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
        await reportService.update(randomId, user, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
        );
      }
    });

    it('Should Not Update a Report (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const report = await createReport(
          title,
          shortDescription,
          date,
          differentField.id,
        );
        await reportService.update(report.id, user, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Report (as USER)', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      const newTitle = 'Abreu';

      const reportUpdated = await reportService.update(report.id, user, {
        title: newTitle,
      });
      expect(reportUpdated).toBeDefined();
      expect(reportUpdated.title).toBe(newTitle);
    });

    it('Should Update a Report (as USER)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      const newTitle = 'Abreu';

      const reportUpdated = await reportService.update(report.id, user, {
        title: newTitle,
        field: differentField.id,
      });
      expect(reportUpdated).toBeDefined();
      expect(reportUpdated.title).toBe(newTitle);
      expect(reportUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Report (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await reportService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
        );
      }
    });

    it('Should Not Remove a Report (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const report = await createReport(
          title,
          shortDescription,
          date,
          differentField.id,
        );
        await reportService.remove(report.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Report (as USER)', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      await reportService.remove(report.id, user);

      const isReportDeleted = await prisma.report.findFirst({
        where: {
          id: report.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isReportDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Report (as ADMIN)', async () => {
      const report = await createReport(
        title,
        shortDescription,
        date,
        field.id,
      );
      await reportService.remove(report.id, admin);

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
