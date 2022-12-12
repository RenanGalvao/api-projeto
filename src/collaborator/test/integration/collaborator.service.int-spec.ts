import {
  BadRequestException,
  CacheInterceptor,
  CacheModule,
  CacheStore,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Collaborator, Field, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
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
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Collaborator Service Integration', () => {
  let prisma: PrismaService;
  let collaboratorService: CollaboratorService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
        CollaboratorModule,
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
    it('Should Create a Collaborator (as USER)', async () => {
      const collaborator = await collaboratorService.create(user, {
        firstName,
        description,
      });

      expect(collaborator.firstName).toBe(firstName);
      expect(collaborator.description).toBe(description);
      expect(collaborator.field.id).toBe(field.id);
    });

    it('Should Not Create aa Collaborator (as ADMIN && Missing Data)', async () => {
      try {
        await collaboratorService.create(admin, {
          firstName,
          description,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Collaborator (as ADMIN)', async () => {
      const collaborator = await collaboratorService.create(admin, {
        firstName,
        description,
        field: field.id,
      });

      expect(collaborator.firstName).toBe(firstName);
      expect(collaborator.description).toBe(description);
      expect(collaborator.field.id).toBe(field.id);
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
        await collaboratorService.update(randomId, user, { firstName: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
        );
      }
    });

    it('Should Not Update a Collaborator (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const collaborator = await createCollaborator(
          firstName,
          description,
          differentField.id,
        );
        await collaboratorService.update(collaborator.id, user, {
          firstName: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Collaborator (as USER)', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      const newFirstName = 'Abreu';

      const collaboratorUpdated = await collaboratorService.update(
        collaborator.id,
        user,
        {
          firstName: newFirstName,
        },
      );
      expect(collaboratorUpdated).toBeDefined();
      expect(collaboratorUpdated.firstName).toBe(newFirstName);
    });

    it('Should Update a Collaborator (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      const newFirstName = 'Abreu';

      const collaboratorUpdated = await collaboratorService.update(
        collaborator.id,
        user,
        {
          firstName: newFirstName,
          field: differentField.id,
        },
      );
      expect(collaboratorUpdated).toBeDefined();
      expect(collaboratorUpdated.firstName).toBe(newFirstName);
      expect(collaboratorUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Collaborator (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await collaboratorService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
        );
      }
    });

    it('Should Not Remove a Collaborator (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const collaborator = await createCollaborator(
          firstName,
          description,
          differentField.id,
        );
        await collaboratorService.remove(collaborator.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Collaborator (as USER)', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await collaboratorService.remove(collaborator.id, user);

      const isCollaboratorDeleted = await prisma.collaborator.findFirst({
        where: {
          id: collaborator.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isCollaboratorDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Collaborator (as ADMIN)', async () => {
      const collaborator = await createCollaborator(
        firstName,
        description,
        field.id,
      );
      await collaboratorService.remove(collaborator.id, admin);

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
