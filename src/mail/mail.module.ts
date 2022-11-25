import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { TokenModule } from 'src/token/token.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => configService.get('mailer'),
      inject: [ConfigService],
    }),
    TokenModule,
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
