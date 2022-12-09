import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Agenda, Field, Role, User } from '@prisma/client';
import { AgendaService } from 'src/agenda/agenda.service';
import { ITEMS_PER_PAGE, MESSAGE, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { createField, createUser } from 'src/utils/test';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { CacheInterceptor, CacheModule, CacheStore } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { redisStore } from 'cache-manager-redis-store';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FieldModule } from 'src/field/field.module';
import { AgendaModule } from 'src/agenda/agenda.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Agenda Service Integration', () => {
  let prisma: PrismaService;
  let agendaService: AgendaService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const title = 'Título';
  const message = 'Mensagem';
  const date = new Date('2022-02-02');

  const createAgenda = async (
    title: string,
    message: string,
    date: Date,
    field: string,
  ) =>
    await prisma.agenda.create({
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
        AgendaModule,
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
    agendaService = moduleRef.get(AgendaService);

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
    it('Should Create an Event (as USER)', async () => {
      const event = await agendaService.create(user, {
        title,
        message,
        date,
      });

      expect(event.title).toBe(title);
      expect(event.message).toBe(message);
      expect(event.date).toStrictEqual(date);
      expect(event.field.id).toBe(field.id);
    });

    it('Should Not Create an Event (as ADMIN && Missing Data)', async () => {
      try {
        await agendaService.create(admin, {
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

    it('Should Create an Event (as ADMIN)', async () => {
      const event = await agendaService.create(admin, {
        title,
        message,
        date,
        field: field.id,
      });

      expect(event.title).toBe(title);
      expect(event.message).toBe(message);
      expect(event.date).toStrictEqual(date);
      expect(event.field.id).toBe(field.id);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await agendaService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an Event List With ${ITEMS_PER_PAGE} Items`, async () => {
      const eventsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message: 'Mensagem',
              date: new Date('2022-01-03'),
              fieldId: field.id,
            } as Agenda),
        );
      await prisma.agenda.createMany({
        data: eventsToCreate,
      });

      const response = await agendaService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Event List With ${randomN} Items`, async () => {
      const eventsToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              title: `Título ${i}`,
              message: 'Mensagem',
              date: new Date('2022-01-03'),
              fieldId: field.id,
            } as Agenda),
        );
      await prisma.agenda.createMany({
        data: eventsToCreate,
      });

      const response = await agendaService.findAll({
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
      const event = await agendaService.findOne(randomId);

      expect(event).toBeNull();
    });

    it('Should Return an Event', async () => {
      const eventCreated = await createAgenda(title, message, date, field.id);

      const event = await agendaService.findOne(eventCreated.id);
      expect(event.title).toBe(title);
      expect(event.message).toBe(message);
      expect(event.date).toStrictEqual(date);
      expect(event.field.id).toBe(field.id);
    });
  });

  describe('update()', () => {
    it('Should Not Update an Event (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await agendaService.update(randomId, user, { title: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
        );
      }
    });

    it('Should Not Update an Event (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const event = await createAgenda(
          title,
          message,
          date,
          differentField.id,
        );
        const newTitle = 'Novo Título';

        await agendaService.update(event.id, user, {
          title: newTitle,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update an Event (as USER)', async () => {
      const event = await createAgenda(title, message, date, field.id);
      const newTitle = 'Novo Título';

      const eventUpdated = await agendaService.update(event.id, user, {
        title: newTitle,
      });
      expect(eventUpdated).toBeDefined();
      expect(eventUpdated.title).toBe(newTitle);
    });

    it('Should Update an Event (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const event = await createAgenda(title, message, date, field.id);
      const newTitle = 'Novo Título';

      const eventUpdated = await agendaService.update(event.id, admin, {
        title: newTitle,
        field: differentField.id,
      });
      expect(eventUpdated).toBeDefined();
      expect(eventUpdated.title).toBe(newTitle);
      expect(eventUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Event (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await agendaService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
        );
      }
    });

    it('Should Not Remove an Event (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const event = await createAgenda(
          title,
          message,
          date,
          differentField.id,
        );

        await agendaService.remove(event.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove an Event (as USER)', async () => {
      const event = await createAgenda(title, message, date, field.id);

      await agendaService.remove(event.id, user);
      const isEventDeleted = await prisma.agenda.findFirst({
        where: {
          id: event.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isEventDeleted.deleted).toBeDefined();
    });

    it('Should Remove an Event (as ADMIN)', async () => {
      const event = await createAgenda(title, message, date, field.id);

      await agendaService.remove(event.id, admin);
      const isEventDeleted = await prisma.agenda.findFirst({
        where: {
          id: event.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isEventDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);
      await prisma.agenda.delete({ where: { id: event.id } });

      await agendaService.restore({ ids: [event.id] });
      const isEventRestored = await prisma.agenda.findFirst({
        where: {
          id: event.id,
        },
      });

      expect(isEventRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should Hard Remove an Event', async () => {
      const event = await createAgenda(title, message, date, field.id);
      await prisma.agenda.delete({ where: { id: event.id } });

      await agendaService.hardRemove({ ids: [event.id] });
      const isEventRemoved = await prisma.agenda.findFirst({
        where: {
          id: event.id,
          deleted: { not: new Date() },
        },
      });
      expect(isEventRemoved).toBeNull();
    });
  });
});
