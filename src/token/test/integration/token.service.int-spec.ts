import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from 'src/token/token.service';
import configuration from 'src/config/configuration';
import { TokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { ITEMS_PER_PAGE } from 'src/constants';
import { v4 as uuidv4 } from 'uuid';
import { MESSAGE } from 'src/constants';

describe('Token Service Integration', () => {
  let prisma: PrismaService;
  let tokenService: TokenService;

  const tokenConfig = configuration().token;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    tokenService = moduleRef.get(TokenService);
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
  });

  describe('create()', () => {
    it(`Should Return a ${tokenConfig.length} Digits Token`, async () => {
      const email = 'email@example.com';
      const tokenType = TokenType.RECOVER_EMAIL;
      const token = await tokenService.create({ email, token_type: tokenType });
      expect(token).toHaveLength(tokenConfig.length);

      const tokenDb = await prisma.token.findFirst({ where: { email } });
      expect(bcrypt.compareSync(token, tokenDb.token)).toBeTruthy();
      expect(tokenDb.email).toBe(email);
      expect(tokenDb.tokenType).toBe(tokenType);
      expect(tokenDb.used).toBe(false);
    });
  });

  describe('validate()', () => {
    it('Should Not Validate Token (Email Not Found)', async () => {
      const email = 'email@example.com';
      try {
        await tokenService.validate(email, 'invalidToken');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        // check for error.response.message
      }
    });

    it('Should Not Validate Token (Token Used)', async () => {
      const email = 'email@example.com';
      const token = tokenConfig.possibleChars[0].repeat(tokenConfig.length);
      const hashedToken = bcrypt.hashSync(token, bcrypt.genSaltSync());

      await prisma.token.create({
        data: {
          token: hashedToken,
          email,
          used: true,
          tokenType: TokenType.RECOVER_EMAIL,
        },
      });

      try {
        await tokenService.validate(email, token);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
      }
    });

    it('Should Not Validate Token (Invalid Token)', async () => {
      const email = 'email@example.com';
      const token = tokenConfig.possibleChars[0].repeat(tokenConfig.length);
      const hashedToken = bcrypt.hashSync(token, bcrypt.genSaltSync());

      const tokenId = (
        await prisma.token.create({
          data: {
            token: hashedToken,
            email,
            used: false,
            tokenType: TokenType.RECOVER_EMAIL,
          },
        })
      ).id;

      try {
        await tokenService.validate(email, 'notvalidToken');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(MESSAGE.EXCEPTION.TOKEN_NOT_SET);
        const isTokenUsed = (
          await prisma.token.findUnique({ where: { id: tokenId } })
        ).used;
        expect(isTokenUsed).toBeFalsy();
      }
    });

    it('Should Validate Token', async () => {
      const email = 'email@example.com';
      const token = tokenConfig.possibleChars[0].repeat(tokenConfig.length);
      const hashedToken = bcrypt.hashSync(token, bcrypt.genSaltSync());

      const tokenId = (
        await prisma.token.create({
          data: {
            token: hashedToken,
            email,
            used: false,
            tokenType: TokenType.RECOVER_EMAIL,
          },
        })
      ).id;

      const isTokenValid = await tokenService.validate(email, token);
      expect(isTokenValid).toBeTruthy();

      const isTokenUsed = (
        await prisma.token.findUnique({ where: { id: tokenId } })
      ).used;
      expect(isTokenUsed).toBeTruthy();
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await tokenService.findAll();
      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a Token List With ${ITEMS_PER_PAGE} Items`, async () => {
      const tokensToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map((v, i) => ({
          token: 'notarealhash',
          email: `email${i}@example.com`,
          used: false,
          tokenType: TokenType.RECOVER_EMAIL,
        }));
      await prisma.token.createMany({
        data: tokensToCreate,
      });

      const response = await tokenService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomNTokens = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a Token List With ${randomNTokens} Items`, async () => {
      const tokensToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map((v, i) => ({
          token: 'notarealhash',
          email: `email${i}@example.com`,
          used: false,
          tokenType: TokenType.RECOVER_EMAIL,
        }));
      await prisma.token.createMany({
        data: tokensToCreate,
      });

      const response = await tokenService.findAll({
        itemsPerPage: randomNTokens,
      });
      expect(response.data).toHaveLength(randomNTokens);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(
        Math.ceil(response.totalCount / randomNTokens),
      );
    });
  });

  describe('findOne()', () => {
    it("Should Return Nothing (Token Doen't Exists)", async () => {
      const randomId = uuidv4();
      const token = await tokenService.findOne(randomId);

      expect(token).toBeNull();
    });

    it('Should Return a Token', async () => {
      const email = 'email@example.com';
      const tokenString = tokenConfig.possibleChars[0].repeat(
        tokenConfig.length,
      );
      const hashedToken = bcrypt.hashSync(tokenString, bcrypt.genSaltSync());
      const tokenCreated = await prisma.token.create({
        data: {
          token: hashedToken,
          email,
          used: false,
          tokenType: TokenType.RECOVER_EMAIL,
        },
      });

      const token = await tokenService.findOne(tokenCreated.id);
      expect(token).toBeDefined();
      expect(token.token).toBe(hashedToken);
      expect(token.used).toBeFalsy();
      expect(token.tokenType).toBe(TokenType.RECOVER_EMAIL);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove Token (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await tokenService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        // check for error.response.message
      }
    });

    it('Should Remove Token', async () => {
      const email = 'email@example.com';
      const tokenString = tokenConfig.possibleChars[0].repeat(
        tokenConfig.length,
      );
      const hashedToken = bcrypt.hashSync(tokenString, bcrypt.genSaltSync());
      const token = await prisma.token.create({
        data: {
          token: hashedToken,
          email,
          used: false,
          tokenType: TokenType.RECOVER_EMAIL,
        },
      });
      await tokenService.remove(token.id);

      const isTokenDeleted = await prisma.token.findFirst({
        where: {
          id: token.id,
          deleted: { lte: new Date() },
        },
      });
      expect(isTokenDeleted).toBeDefined();
    });
  });
});
