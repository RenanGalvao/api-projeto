import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { CACHE_MANAGER, NotFoundException } from '@nestjs/common';
import { FileService } from 'src/file/file.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FILES_PATH,
  MAX_FILE_SIZE,
  TEMPLATE,
  TEST_FILES_PATH,
} from 'src/constants';
import { JestUtils } from 'src/utils';
import * as request from 'supertest';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { File, Role, User } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { HttpExceptionFilter } from 'src/http-exception.filter';
import { ITEMS_PER_PAGE } from 'src/constants';
import { Cache } from 'cache-manager';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createUser, getToken, setAppConfig } from 'src/utils/test';

describe('File Service Integration', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let fileService: FileService;
  let cacheManager: Cache;

  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;
  const password = '12345678';
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  let filePathMaxSize: string;
  let filesPathMaxSize: (n: number) => Promise<string>[];
  let filePathExceededSize: string;
  let filesPathExceededSize: (n: number) => Promise<string>[];
  const fileNameMaxSize = 'maxSize.txt';
  const filesNameMaxSize = (n: number) => `maxSize-${n}.txt`;
  const fileNameExceededSize = 'exceededSize.txt';
  // const filesNameExceededSize = (n: number) => `maxSize-${n}.txt`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        // look at configuration.ts
        ConfigModule.forRoot({
          load: [
            () => ({
              ...configuration(),
              throttle: {
                ttl: 1,
                limit: 100,
              },
            }),
          ],
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setAppConfig(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    fileService = moduleRef.get(FileService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    user = await createUser(prisma, 'João', 'user@example.com', hashedPassword);
    userToken = await getToken(app, user.email, password);

    admin = await createUser(
      prisma,
      'Admin',
      'based@email.com',
      hashedPassword,
      Role.ADMIN,
    );
    adminToken = await getToken(app, admin.email, password);

    filePathMaxSize = await JestUtils.createFile(
      fileNameMaxSize,
      MAX_FILE_SIZE - 1,
    );
    filePathExceededSize = await JestUtils.createFile(
      fileNameExceededSize,
      MAX_FILE_SIZE * 1.2,
    );
    filesPathMaxSize = (n: number) =>
      Array(n)
        .fill(0)
        .map((k, i) =>
          JestUtils.createFile(filesNameMaxSize(i), MAX_FILE_SIZE - 1),
        );
    filesPathExceededSize = (n: number) =>
      Array(n)
        .fill(0)
        .map((k, i) =>
          JestUtils.createFile(filesNameMaxSize(i), MAX_FILE_SIZE * 1.2),
        );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
    await cacheManager.reset();
    fs.rmSync(FILES_PATH, { recursive: true, force: true });
  });

  afterAll(() => {
    //fs.unlinkSync(filePathMaxSize);
    //fs.unlinkSync(filePathExceededSize);
    fs.rmSync(FILES_PATH, { recursive: true, force: true });
    fs.rmSync(TEST_FILES_PATH, { recursive: true, force: true });
  });

  describe('create()', () => {
    it('Should Save File and Create an Entry', async () => {
      await JestUtils.sleep(150);

      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const fileDoc = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      expect(fileDoc).toBeDefined();

      const fileExists = fs.existsSync(`${FILES_PATH}${fileDoc.name}`);
      expect(fileExists).toBeTruthy();
    });

    it('Should Not Save File Nor Create an Entry (No Auth)', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .attach('file', filePathMaxSize)
        .expect(401);

      const fileDoc = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      expect(fileDoc).toBeNull();

      const filesFolderExists = fs.existsSync(FILES_PATH);
      expect(filesFolderExists).toBeFalsy();
    });

    it('Should Not Save File Nor Create an Entry (Exceeded Size)', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathExceededSize)
        .expect(422);

      const fileDoc = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameExceededSize },
        },
      });
      expect(fileDoc).toBeNull();

      const filesInFolder = fs.readdirSync(FILES_PATH);
      expect(filesInFolder).toHaveLength(0);
    });
  });

  describe('bulkCreate()', () => {
    it('Should Save Files and Create an Entry', async () => {
      const maxFiles = 10;
      const filesCount = Math.ceil(Math.random() * maxFiles);
      const files = await Promise.all(filesPathMaxSize(filesCount));

      const requestInstance = request(app.getHttpServer())
        .post('/file/bulk')
        .set('Authorization', `bearer ${userToken}`);

      for (const file of files) {
        requestInstance.attach('files', file);
      }
      await requestInstance.expect(201);

      const fileDoc = await prisma.file.count();
      expect(fileDoc).toBe(filesCount);

      const filesInFolder = fs.readdirSync(FILES_PATH);
      expect(filesInFolder).toHaveLength(filesCount);
    });

    it('Should Not Save Files Nor Create an Entry (No Auth)', async () => {
      const maxFiles = 10;
      const filesCount = Math.ceil(Math.random() * maxFiles);
      const files = await Promise.all(filesPathMaxSize(filesCount));

      const requestInstance = request(app.getHttpServer()).post('/file/bulk');

      for (const file of files) {
        requestInstance.attach('files', file);
      }
      await requestInstance.expect(401);

      const fileDoc = await prisma.file.count();
      expect(fileDoc).toBe(0);

      const filesFolderExists = fs.existsSync(FILES_PATH);
      expect(filesFolderExists).toBeFalsy();
    });

    it('Should Not Save Files Nor Create an Entry (Exceeded Size)', async () => {
      const maxFiles = 10;
      const filesCount = Math.ceil(Math.random() * maxFiles);
      const files = await Promise.all(filesPathExceededSize(filesCount));

      const requestInstance = request(app.getHttpServer())
        .post('/file/bulk')
        .set('Authorization', `bearer ${userToken}`);

      for (const file of files) {
        requestInstance.attach('files', file);
      }
      await requestInstance.expect(422);

      const fileDoc = await prisma.file.count();
      expect(fileDoc).toBe(0);

      const filesInFolder = fs.readdirSync(FILES_PATH);
      expect(filesInFolder).toHaveLength(0);
    });
  });

  describe('findAll()', () => {
    it('Should Return an Empty Array', async () => {
      const response = await fileService.findAll();
      expect(response.data).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it(`Should Return a File List with ${ITEMS_PER_PAGE} Items`, async () => {
      const filesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: filesNameMaxSize(i),
              mimeType: 'text/plain',
              size: MAX_FILE_SIZE,
            } as File),
        );
      await prisma.file.createMany({
        data: filesToCreate,
      });

      const response = await fileService.findAll();
      expect(response.data).toHaveLength(ITEMS_PER_PAGE);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(1);
    });

    const randomNFiles = Math.ceil(Math.random() * ITEMS_PER_PAGE);
    it(`Should Return a File Listh With ${randomNFiles} Items`, async () => {
      const filesToCreate = Array(ITEMS_PER_PAGE)
        .fill(0)
        .map(
          (v, i) =>
            ({
              name: filesNameMaxSize(i),
              mimeType: 'text/plain',
              size: MAX_FILE_SIZE,
            } as File),
        );
      await prisma.file.createMany({
        data: filesToCreate,
      });

      const response = await fileService.findAll({
        itemsPerPage: randomNFiles,
      });
      expect(response.data).toHaveLength(randomNFiles);
      expect(response.totalCount).toBe(ITEMS_PER_PAGE);
      expect(response.totalPages).toBe(
        Math.ceil(response.totalCount / randomNFiles),
      );
    });
  });

  describe('findOne()', () => {
    it("Should Return Nothing (File Doc Doesn't Exists)", async () => {
      const randomId = uuidv4();
      const file = await fileService.findOne(randomId);

      expect(file).toBeNull();
    });

    it('Should Return a File Doc', async () => {
      const fileName = 'my-file.txt';
      const mimeType = 'text/plain';
      const size = 10245;

      const fileCreated = await prisma.file.create({
        data: {
          name: fileName,
          mimeType,
          size,
        },
      });

      const file = await fileService.findOne(fileCreated.id);
      expect(user).toBeDefined();
      expect(file.name).toBe(fileName);
      expect(file.mimeType).toBe(mimeType);
      expect(file.size).toBe(size);
    });
  });

  describe('remove()', () => {
    it('Should Not Remove File Doc (Not Found)', async () => {
      try {
        const randomId = uuidv4();
        await fileService.remove(randomId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('arquivo', 'o'),
        );
      }
    });

    it('Should Remove Doc, Not File (Archive)', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const file = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      await fileService.remove(file.id);

      const fileExists = fs.existsSync(`${FILES_PATH}${file.name}`);
      expect(fileExists).toBeTruthy();
    });
  });

  describe('restore()', () => {
    it('Should Not Restore File', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const file = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      await fileService.remove(file.id);

      await request(app.getHttpServer())
        .put('/file/restore')
        .send({ ids: [file.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isFileRestored = await prisma.file.findFirst({
        where: {
          name: file.name,
          deleted: { not: new Date() },
        },
      });
      expect(isFileRestored.deleted).not.toBeNull();
    });

    it('Should Restore File', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const file = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      await fileService.remove(file.id);

      await request(app.getHttpServer())
        .put('/file/restore')
        .send({ ids: [file.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isFileRestored = await prisma.file.findFirst({
        where: {
          name: file.name,
          deleted: null,
        },
      });
      expect(isFileRestored.deleted).toBeNull();
    });
  });

  describe('hardRemove()', () => {
    it('Should Not Hard Remove File', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const file = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      await fileService.remove(file.id);

      await request(app.getHttpServer())
        .delete('/file/hard-remove')
        .send({ ids: [file.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${userToken}`)
        .expect(403);

      const isFileRemoved = await prisma.file.findFirst({
        where: {
          name: file.name,
          deleted: { not: new Date() },
        },
      });
      expect(isFileRemoved.deleted).not.toBeNull();
    });

    it('Should Hard Remove File', async () => {
      await request(app.getHttpServer())
        .post('/file')
        .set('Authorization', `bearer ${userToken}`)
        .attach('file', filePathMaxSize)
        .expect(201);

      const file = await prisma.file.findFirst({
        where: {
          name: { contains: fileNameMaxSize },
        },
      });
      await fileService.remove(file.id);

      await request(app.getHttpServer())
        .delete('/file/hard-remove')
        .send({ ids: [file.id] })
        .set('Content-type', 'application/json')
        .set('Authorization', `bearer ${adminToken}`)
        .expect(200);

      const isFileRemoved = await prisma.file.findFirst({
        where: {
          name: file.name,
          deleted: { not: new Date() },
        },
      });
      expect(isFileRemoved).toBeNull();

      const fileExists = fs.existsSync(`${FILES_PATH}${file.name}`);
      expect(fileExists).toBeFalsy();
    });
  });
});
