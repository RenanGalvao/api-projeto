import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard, JwtStrategy } from './jwt';
import { RefreshJwtStrategy } from './refresh-jwt';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles';
import { MailModule } from 'src/mail/mail.module';
import { TokenModule } from 'src/token/token.module';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => configService.get('jwt.accessToken'),
      inject: [ConfigService],
    }),
    MailModule,
    TokenModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
