import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Field, Role, User } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { ITEMS_PER_PAGE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { TEMPLATE } from 'src/constants';
import { createField } from 'src/utils/test';

jest.setTimeout(30 * 1_000);

describe('User Service Integration', () => {
  let prisma: PrismaService;
  let userService: UserService;

  let field: Field;

  const firstName = 'Jão';
  const email = 'user@example.com';
  const password = '12345678';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    userService = moduleRef.get(UserService);

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
    it('Should Create an User', async () => {
      const user = await userService.create({
        firstName,
        email,
        password,
        field: field.id,
      });

      expect(user.firstName).toBe(firstName);
      expect(user.email).toBe(email);
      expect(user.role).toBe(Role.VOLUNTEER);
      expect(user.avatar).toBeNull();
      expect(user.lastAccess).toBeDefined();
    });

    it('Should Not Create an User (Duplicated)', async () => {
      await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: 'notarealhash',
          fieldId: field.id
        },
      });

      try {
        await userService.create({ firstName, email, password, field: field.id });
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.response.message).toBeDefined();
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.CONFLICT('E-mail', 'o'),
        );
      }
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await userService.findAll();
      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return an User List With ${ITEMS_PER_PAGE} Items`, async () => {
      const usersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `Jão ${i}`,
              email: `user${i}@example.com`,
              hashedPassword: 'notarealhash',
            } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await userService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.data[0].hashedPassword).toBeUndefined();
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomNUsers = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return an User List With ${randomNUsers} Items`, async () => {
      const usersToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              firstName: `Jão ${i}`,
              email: `user${i}@example.com`,
              hashedPassword: 'notarealhash',
            } as User),
        );
      await prisma.user.createMany({
        data: usersToCreate,
      });

      const response = await userService.findAll({
        itemsPerPage: randomNUsers,
      });
      expect(response.data).toHaveLength(randomNUsers);
      expect(response.data[0].hashedPassword).toBeUndefined();
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(
        Math.ceil(response.totalCount / randomNUsers),
      );
    });
  });

  describe('findOne()', () => {
    it("Should Return Nothing (User Doesn't Exists)", async () => {
      const randomId = uuidv4();
      const user = await userService.findOne(randomId);

      expect(user).toBeNull();
    });

    it('Should Return an User', async () => {
      const userCreated = await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: 'notarealhash',
        },
      });

      const user = await userService.findOne(userCreated.id);
      expect(user.firstName).toBe(firstName);
      expect(user.email).toBe(email);
      expect(user.role).toBe(Role.VOLUNTEER);
      expect(user.avatar).toBeNull();
      expect(user.lastAccess).toBeDefined();
    });
  });

  describe('findByEmailAuth()', () => {
    it("Should Return Nothing (User Doesn't Exists)", async () => {
      const user = await userService.findByEmailAuth(email);
      expect(user).toBeNull();
    });

    it('Should Return an User', async () => {
      await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: 'notarealhash',
        },
      });

      const user = await userService.findByEmailAuth(email);
      expect(user.email).toBe(email);
      expect(user.role).toBe(Role.VOLUNTEER);
      expect(user.hashedPassword).toBeDefined();
    });
  });

  describe('update()', () => {
    it('Should Not Update an User (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await userService.update(randomId, {
          firstName: 'Primeiro',
          lastName: 'Último',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
        );
      }
    });

    it('Should Update an User', async () => {
      const lastName = 'Brilha';
      const user = await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: 'notarealhash',
        },
      });

      const userUpdated = await userService.update(user.id, { lastName });
      expect(userUpdated.firstName).toBe(firstName);
      expect(userUpdated.lastName).toBe(lastName);
      expect(userUpdated.email).toBe(email);
      expect(userUpdated.role).toBe(Role.VOLUNTEER);
      expect(userUpdated.avatar).toBeNull();
      expect(userUpdated.lastAccess).toBeDefined();
    });
  });

  describe('updateLastAccess()', () => {
    it("Should Not Update 'lastAccess' From User (Not Found)", async () => {
      const randomId = uuidv4();
      try {
        await userService.updateLastAccess(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
        );
      }
    });

    it("Should Update 'lastAccess' from User", async () => {
      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
          role: Role.VOLUNTEER,
        },
      });
      const oldLastAccess = user.lastAccess;

      await userService.updateLastAccess(user.id);
      const newLastAccess = (
        await prisma.user.findUnique({
          where: { id: user.id },
        })
      ).lastAccess;

      expect(newLastAccess.getTime()).toBeGreaterThan(oldLastAccess.getTime());
    });
  });

  describe('updatePasswordByEmail()', () => {
    it("Should Not Update User's Email (Not Found)", async () => {
      try {
        await userService.updatePasswordByEmail(email, '123');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it("Should Update User's Passsword", async () => {
      const oldHash = 'notarealhash';
      const newPassword = '123';
      await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: oldHash,
          role: Role.VOLUNTEER,
        },
      });

      await userService.updatePasswordByEmail(email, newPassword);
      const newHash = (await prisma.user.findUnique({ where: { email } }))
        .hashedPassword;

      expect(newHash).not.toBe(oldHash);
      expect(bcrypt.compareSync(newPassword, newHash)).toBeTruthy();
    });
  });

  describe('remove()', () => {
    it('Should Not Remove User (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await userService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
        );
      }
    });

    it('Should Remove User', async () => {
      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
        },
      });

      await userService.remove(user.id);
      const isUserDeleted = await prisma.user.findFirst({
        where: {
          id: user.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isUserDeleted).toBeDefined();
    });
  });

  describe('findOneMe', () => {
    it('Should Return Own User', async () => {
      const email = 'email@example.com';
      const userCreated = await prisma.user.create({
        data: {
          firstName,
          email,
          hashedPassword: 'notarealhash',
        },
      });

      const user = await userService.findOneMe(userCreated);
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
    });
  });

  describe('updateMe', () => {
    it('Should Update Own User', async () => {
      const lastName = 'Brilha';
      const password = 'anotherone';

      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
        },
      });

      const userUpdated = await userService.updateMe(user, {
        lastName,
        password,
      });
      expect(userUpdated).toBeDefined();
      expect(userUpdated.lastName).toBe(lastName);

      const newHashedPassword = (
        await prisma.user.findUnique({ where: { email: user.email } })
      ).hashedPassword;
      expect(user.hashedPassword).not.toBe(newHashedPassword);
    });
  });

  describe('removeMe()', () => {
    it('Should Remove Own User', async () => {
      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
        },
      });
      await userService.removeMe(user);

      const isUserRemoved = await prisma.user.findFirst({
        where: {
          email: 'email@example.com',
          deleted: { lt: new Date() },
        },
      });
      expect(isUserRemoved).toBeDefined();
    });
  });

  describe('restore()', () => {
    it('Should Restore Entry', async () => {
      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
        },
      });
      await userService.remove(user.id);

      await userService.restore({ ids: [user.id] });
      const isUserRestored = await prisma.user.findFirst({
        where: {
          email: user.email,
        },
      });

      expect(isUserRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should Hard Remove Entry', async () => {
      const user = await prisma.user.create({
        data: {
          firstName,
          email: 'email@example.com',
          hashedPassword: 'notarealhash',
        },
      });
      await userService.remove(user.id);

      await userService.hardRemove({ ids: [user.id] });
      const isUserRemoved = await prisma.user.findFirst({
        where: {
          email: user.email,
          deleted: { not: new Date() },
        },
      });
      expect(isUserRemoved).toBeNull();
    });
  });
});
