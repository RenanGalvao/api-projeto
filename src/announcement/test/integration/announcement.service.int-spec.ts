import {
  BadRequestException,
  CacheInterceptor,
  CacheModule,
  CacheStore,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Announcement, Field, Role, User } from '@prisma/client';
import { AnnouncementService } from 'src/announcement/announcement.service';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField, createUser } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { AnnouncementModule } from 'src/announcement/announcement.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Announcement Service Integration', () => {
  let prisma: PrismaService;
  let announcementService: AnnouncementService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
        AnnouncementModule,
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
    it('Should Create an Announcement (as USER)', async () => {
      const announcement = await announcementService.create(user, {
        title,
        message,
        date,
      });

      expect(announcement.title).toBe(title);
      expect(announcement.message).toBe(message);
      expect(announcement.date).toStrictEqual(date);
      expect(announcement.field.id).toBe(field.id);
    });

    it('Should Not Create an Event (as ADMIN && Missing Data)', async () => {
      try {
        await announcementService.create(admin, {
          title,
          message,
          date,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create an Announcement (as ADMIN)', async () => {
      const announcement = await announcementService.create(user, {
        title,
        message,
        date,
        field: field.id,
      });

      expect(announcement.title).toBe(title);
      expect(announcement.message).toBe(message);
      expect(announcement.date).toStrictEqual(date);
      expect(announcement.field.id).toBe(field.id);
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
        await announcementService.update(randomId, user, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
        );
      }
    });

    it('Should Not Update an Announcement (as USER && Different Data)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const announcement = await createAnnouncement(
          title,
          message,
          date,
          differentField.id,
        );
        const newTitle = 'Novo Título';

        const announcementUpdated = await announcementService.update(
          announcement.id,
          user,
          {
            title: newTitle,
          },
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update an Announcement (as USER)', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      const newTitle = 'Novo Título';

      const announcementUpdated = await announcementService.update(
        announcement.id,
        user,
        {
          title: newTitle,
        },
      );
      expect(announcementUpdated).toBeDefined();
      expect(announcementUpdated.title).toBe(newTitle);
    });

    it('Should Update an Announcement (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );
      const newTitle = 'Novo Título';

      const announcementUpdated = await announcementService.update(
        announcement.id,
        admin,
        {
          title: newTitle,
          field: differentField.id,
        },
      );
      expect(announcementUpdated).toBeDefined();
      expect(announcementUpdated.title).toBe(newTitle);
      expect(announcementUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Announcement (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await announcementService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
        );
      }
    });

    it('Should Not Remove an Announcement (as USER && Different Data)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const announcement = await createAnnouncement(
          title,
          message,
          date,
          differentField.id,
        );
        const newTitle = 'Novo Título';

        const announcementUpdated = await announcementService.remove(
          announcement.id,
          user,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove an Announcement (as USER)', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      await announcementService.remove(announcement.id, user);
      const isAnnouncementDeleted = await prisma.announcement.findFirst({
        where: {
          id: announcement.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isAnnouncementDeleted.deleted).toBeDefined();
    });

    it('Should Remove an Announcement (as ADMIN)', async () => {
      const announcement = await createAnnouncement(
        title,
        message,
        date,
        field.id,
      );

      await announcementService.remove(announcement.id, admin);
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
