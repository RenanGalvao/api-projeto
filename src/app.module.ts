import {
  CacheInterceptor,
  CacheModule,
  CacheStore,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-store';

import { AuthModule } from './auth/auth.module';
import { LogModule } from './log/log.module';
import { TokenModule } from './token/token.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { FileModule } from './file/file.module';
import { UserModule } from './user/user.module';

import { LoggerMiddleware } from './logger.middleware';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { ResponseInterceptor } from './response.interceptor';

import { VolunteerModule } from './volunteer/volunteer.module';
import { FieldModule } from './field/field.module';
import { AgendaModule } from './agenda/agenda.module';
import { AssistedFamilyModule } from './assisted-family/assisted-family.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('throttle.ttl'),
        limit: config.get('throttle.limit'),
      }),
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
    LogModule,
    TokenModule,
    MailModule,
    PrismaModule,
    FileModule,
    UserModule,

    // Specific
    VolunteerModule,

    FieldModule,

    AgendaModule,

    AssistedFamilyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
