import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as request from 'supertest';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { HttpExceptionFilter } from 'src/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

export async function createUser(
  prismaService: PrismaService,
  firstName: string,
  email: string,
  hashedPassword: string,
  role: Role = Role.VOLUNTEER,
  field: string = null,
) {
  if (!field) {
    return await prismaService.user.create({
      data: { firstName, email, hashedPassword, role },
    });
  } else {
    return await prismaService.user.create({
      data: {
        firstName,
        email,
        hashedPassword,
        role,
        field: { connect: { id: field } },
      },
    });
  }
}

export async function getToken(
  app: NestExpressApplication,
  email: string,
  password: string,
  refreshToken: boolean = false,
) {
  return (
    await request(app.getHttpServer())
      .post('/auth/signin')
      .set('Content-type', 'application/json')
      .send({ email, password: password })
  ).body.data[refreshToken ? 'refreshToken' : 'accessToken'];
}

export async function createField(
  prismaService: PrismaService,
  continent: string,
  country: string,
  state: string,
  abbreviation: string,
  designation: string,
) {
  return await prismaService.field.create({
    data: {
      country,
      continent,
      state,
      abbreviation,
      designation,
    },
  });
}

export function setAppConfig(app: NestExpressApplication) {
  // From main.ts
  app.set('trust proxy', 1);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(helmet());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    exposedHeaders: ['x-total-count', 'x-total-pages'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
