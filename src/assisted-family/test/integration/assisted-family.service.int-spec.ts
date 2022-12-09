import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AssistedFamily,
  AssistedFamilyGroup,
  Field,
  Role,
  User,
} from '@prisma/client';
import { AssistedFamilyService } from 'src/assisted-family/assisted-family.service';
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
import { AssistedFamilyModule } from 'src/assisted-family/assisted-family.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from 'src/response.interceptor';
import { CacheControlInterceptor } from 'src/cache-control.interceptor';

describe('Assisted Family Service Integration', () => {
  let prisma: PrismaService;
  let assistedFamilyService: AssistedFamilyService;

  let field: Field;
  let user: User;
  let admin: User;

  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  const representative = 'Mário';
  const period = 'Período';
  const group = AssistedFamilyGroup.AE;

  const createAssistedFamily = async (
    representative: string,
    period: string,
    group: AssistedFamilyGroup,
    field: string,
  ) =>
    await prisma.assistedFamily.create({
      data: {
        representative,
        period,
        group,
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
        AssistedFamilyModule,
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
    assistedFamilyService = moduleRef.get(AssistedFamilyService);

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
    it('Should Create an Assisted Family (as USER)', async () => {
      const assistedFamily = await assistedFamilyService.create(user, {
        representative,
        period,
        group,
      });

      expect(assistedFamily.representative).toBe(representative);
      expect(assistedFamily.period).toBe(period);
      expect(assistedFamily.group).toBe(group);
      expect(assistedFamily.field.id).toBe(field.id);
    });

    it('Should Not Create An Assited Family (as ADMIN && Missing Data)', async () => {
      try {
        await assistedFamilyService.create(admin, {
          representative,
          period,
          group,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.message).toBe(
          TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
        );
      }
    });

    it('Should Create an Assisted Family (as ADMIN)', async () => {
      const assistedFamily = await assistedFamilyService.create(admin, {
        representative,
        period,
        group,
        field: field.id,
      });

      expect(assistedFamily.representative).toBe(representative);
      expect(assistedFamily.period).toBe(period);
      expect(assistedFamily.group).toBe(group);
      expect(assistedFamily.field.id).toBe(field.id);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await assistedFamilyService.findAll();

      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an Assisted Family List With ${ITEMS_PER_PAGE} Items`, async () => {
      const assistedFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              period: 'Período',
              group,
              fieldId: field.id,
            } as AssistedFamily),
        );
      await prisma.assistedFamily.createMany({
        data: assistedFamiliesToCreate,
      });

      const response = await assistedFamilyService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomN = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an Assisted Family List With ${randomN} Items`, async () => {
      const assistedFamiliesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              representative: `João ${i}`,
              period: 'Período',
              group,
              fieldId: field.id,
            } as AssistedFamily),
        );
      await prisma.assistedFamily.createMany({
        data: assistedFamiliesToCreate,
      });

      const response = await assistedFamilyService.findAll({
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
      const assistedFamily = await assistedFamilyService.findOne(randomId);

      expect(assistedFamily).toBeNull();
    });

    it('Should Return an Assisted Family', async () => {
      const assistedFamilyCreated = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );

      const assistedFamily = await assistedFamilyService.findOne(
        assistedFamilyCreated.id,
      );
      expect(assistedFamily.representative).toBe(representative);
      expect(assistedFamily.period).toBe(period);
      expect(assistedFamily.group).toBe(group);
      expect(assistedFamily.field.id).toBe(field.id);
    });
  });

  describe('update()', () => {
    it('Should Not Update an Assisted Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await assistedFamilyService.update(randomId, user, {
          representative: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
        );
      }
    });

    it('Should Not Update an Assisted Family (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const assistedFamily = await createAssistedFamily(
          representative,
          period,
          group,
          differentField.id,
        );
        await assistedFamilyService.update(assistedFamily.id, user, {
          representative: 'lol',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Update an Assisted Family (as USER)', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const assistedFamilyUpdated = await assistedFamilyService.update(
        assistedFamily.id,
        user,
        {
          representative: newRepresentative,
        },
      );
      expect(assistedFamilyUpdated).toBeDefined();
      expect(assistedFamilyUpdated.representative).toBe(newRepresentative);
    });

    it('Should Update an Assisted Family (as ADMIN)', async () => {
      const differentField = await createField(
        prisma,
        'América',
        'Brasil',
        'São Paulo',
        'AMEBRSP01',
        'Designação',
      );
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      const newRepresentative = 'Abreu';

      const assistedFamilyUpdated = await assistedFamilyService.update(
        assistedFamily.id,
        admin,
        {
          representative: newRepresentative,
          field: differentField.id,
        },
      );
      expect(assistedFamilyUpdated).toBeDefined();
      expect(assistedFamilyUpdated.representative).toBe(newRepresentative);
      expect(assistedFamilyUpdated.field.id).toBe(differentField.id);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove an Assisted Family (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await assistedFamilyService.remove(randomId, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
        );
      }
    });

    it('Should Not Remove an Assisted Family (as USER && Different Field)', async () => {
      try {
        const differentField = await createField(
          prisma,
          'América',
          'Brasil',
          'São Paulo',
          'AMEBRSP01',
          'Designação',
        );
        const assistedFamily = await createAssistedFamily(
          representative,
          period,
          group,
          differentField.id,
        );

        await assistedFamilyService.remove(assistedFamily.id, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.FORBIDDEN);
      }
    });

    it('Should Remove an Assisted family (as USER)', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );

      await assistedFamilyService.remove(assistedFamily.id, user);
      const isAssistedFamilyDeleted = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isAssistedFamilyDeleted.deleted).toBeDefined();
    });

    it('Should Remove an Assisted family (as ADMIN)', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );

      await assistedFamilyService.remove(assistedFamily.id, admin);
      const isAssistedFamilyDeleted = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isAssistedFamilyDeleted.deleted).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore an Assisted Family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      await prisma.assistedFamily.delete({ where: { id: assistedFamily.id } });

      await assistedFamilyService.restore({ ids: [assistedFamily.id] });
      const isAssistedFamilyRestored = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
        },
      });

      expect(isAssistedFamilyRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should HardRemove an Assisted Family', async () => {
      const assistedFamily = await createAssistedFamily(
        representative,
        period,
        group,
        field.id,
      );
      await prisma.assistedFamily.delete({ where: { id: assistedFamily.id } });

      await assistedFamilyService.hardRemove({ ids: [assistedFamily.id] });
      const isAssistedFamilyRemoved = await prisma.assistedFamily.findFirst({
        where: {
          id: assistedFamily.id,
          deleted: { not: new Date() },
        },
      });
      expect(isAssistedFamilyRemoved).toBeNull();
    });
  });
});
