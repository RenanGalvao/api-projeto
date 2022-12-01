import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import * as nodemailer from 'nodemailer';
import { NotFoundException } from '@nestjs/common';
import { TEMPLATE } from 'src/constants';

jest.setTimeout(30 * 1_000);

describe('Main Service Integration', () => {
  let prisma: PrismaService;
  let mailService: MailService;

  beforeAll(async () => {
    const mailAccount = await nodemailer.createTestAccount();
    const moduleRef = await Test.createTestingModule({
      imports: [
        // look at configuration.ts
        ConfigModule.forRoot({
          load: [
            () => ({
              ...configuration,
              mailer: {
                ...configuration().mailer,
                transport: {
                  host: mailAccount.smtp.host,
                  secure: mailAccount.smtp.secure,
                  port: mailAccount.smtp.port,
                  auth: {
                    user: mailAccount.user,
                    pass: mailAccount.pass,
                  },
                },
              },
            }),
          ],
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    mailService = moduleRef.get(MailService);
  });

  beforeEach(async () => {
    await prisma.cleanDataBase();
  });

  describe('sendRecoverEmail', () => {
    const email = 'user@example.com';

    it('Should Not Send Email (User Not Found)', async () => {
      try {
        await mailService.sendRecoverEmail({ email });
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toBe(
          TEMPLATE.EXCEPTION.NOT_FOUND('e-mail', 'o'),
        );

        const token = await prisma.token.findFirst({ where: { email } });
        expect(token).toBeNull();
      }
    });

    it('Should Send Email', async () => {
      await prisma.user.create({
        data: {
          firstName: 'João',
          email,
          hashedPassword: 'notrealrash',
        },
      });
      await mailService.sendRecoverEmail({ email });

      const token = await prisma.token.findFirst({ where: { email } });
      expect(token).toBeDefined();
    });
  });
});
