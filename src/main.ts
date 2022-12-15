import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { readFileSync } from 'fs';

import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { HttpExceptionFilter } from './http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  CollectionPoints,
  MapOptions,
  PolygonOptions,
} from './utils/google-maps/classes';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // Swagger
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const config = new DocumentBuilder()
    .setTitle(packageJson.name.toUpperCase())
    .setDescription(packageJson.description)
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    // Field's properties
    extraModels: [MapOptions, PolygonOptions, CollectionPoints],
  });
  SwaggerModule.setup('doc', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(3000);
}
bootstrap();
