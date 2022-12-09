import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Church, Field, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ChurchService } from 'src/church/church.service';
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
import { ChurchModule } from 'src/church/church.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Church Service Integration', () => {
  let prisma: PrismaService;
  let churchService: ChurchService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

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
        ChurchModule,
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
    it('Should Create a Church (as USER)', async () => {
      const church = await churchService.create(user, {
        name,
        description,
        image,
      });

      expect(church.name).toBe(name);
      expect(church.description).toBe(description);
      expect(church.image).toBe(image);
      expect(church.field.id).toBe(field.id);
    });

    it('Should Not Create a Church (as ADMIN && Missing Data)', async () => {
      try {
        await churchService.create(admin, {
          name,
          description,
          image,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create a Church (as ADMIN)', async () => {
      const church = await churchService.create(admin, {
        name,
        description,
        image,
        field: field.id,
      });

      expect(church.name).toBe(name);
      expect(church.description).toBe(description);
      expect(church.image).toBe(image);
      expect(church.field.id).toBe(field.id);
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
        await churchService.update(randomId, user, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
        );
      }
    });

    it('Should Not Update a Church (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const church = await createChurch(
          name,
          description,
          image,
          differentField.id,
        );
        await churchService.update(church.id, user, { name: 'lol' });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update a Church (as USER)', async () => {
      const church = await createChurch(name, description, image, field.id);
      const newName = 'Abreu';

      const churchUpdated = await churchService.update(church.id, user, {
        name: newName,
      });
      expect(churchUpdated).toBeDefined();
      expect(churchUpdated.name).toBe(newName);
    });

    it('Should Update a Church (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const church = await createChurch(name, description, image, field.id);
      const newName = 'Abreu';

      const churchUpdated = await churchService.update(church.id, user, {
        name: newName,
        field: differentField.id,
      });
      expect(churchUpdated).toBeDefined();
      expect(churchUpdated.name).toBe(newName);
      expect(churchUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove a Church (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await churchService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
        );
      }
    });

    it('Should Not Remove a Church (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const church = await createChurch(
          name,
          description,
          image,
          differentField.id,
        );
        await churchService.remove(church.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove a Church (as USER)', async () => {
      const church = await createChurch(name, description, image, field.id);

      await churchService.remove(church.id, user);
      const ischurchDeleted = await prisma.church.findFirst({
        where: {
          id: church.id,
          deleted: { lte: new Date() },
        },
      });
      expect(ischurchDeleted.deleted).toBeDefined();
    });

    it('Should Remove a Church (as ADMIN)', async () => {
      const church = await createChurch(name, description, image, field.id);

      await churchService.remove(church.id, admin);
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
