import { Injectable, NotFoundException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TokenService } from 'src/token/token.service';
import { SendRecoverEmailDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenType } from '@prisma/client';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private prismaService: PrismaService,
    private tokenService: TokenService,
    private configService: ConfigService,
  ) {}

  async sendRecoverEmail(sendRecoverEmailDto: SendRecoverEmailDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: sendRecoverEmailDto.email,
      },
    });

    if (user) {
      const token = await this.tokenService.create({
        email: user.email,
        token_type: TokenType.RECOVER_EMAIL,
      });

      const domain = this.configService.get('domain');
      const email = sendRecoverEmailDto.email;
      const url = TEMPLATE.MAIL.RECOVER_MAIL_URL(domain, email, token);

      await this.mailerService.sendMail({
        to: user.email,
        subject: MESSAGE.MAIL.RECOVER_MAIL_SUBJECT,
        template: 'recover-mail',
        context: {
          domain,
          name: user.firstName,
          url: url,
          token,
        },
      });
      return true;
    } else {
      throw new NotFoundException({
        message: TEMPLATE.EXCEPTION.NOT_FOUND('e-mail', 'o'),
        data: {},
      });
    }
  }
}
