import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { CreateTokenDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Token } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { PaginationDto } from 'src/prisma/dto';
import { MESSAGE, TEMPLATE } from 'src/constants';

@Injectable()
export class TokenService {
  private expiresIn = this.configService.get<number>('token.expiresIn');
  private lenght = this.configService.get<number>('token.length');
  private possibleChars = this.configService.get('token.possibleChars');

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {}

  async create(createTokenDto: CreateTokenDto) {
    const tokenString = this.generateToken();
    await this.prismaService.token.create({
      data: {
        email: createTokenDto.email,
        tokenType: createTokenDto.token_type,
        token: bcrypt.hashSync(tokenString, bcrypt.genSaltSync()),
      },
    });
    return tokenString;
  }

  async validate(email: string, token: string) {
    const tokenDoc = await this.prismaService.token.findFirst({
      where: {
        email,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (tokenDoc == null) {
      throw new NotFoundException({
        message: MESSAGE.EXCEPTION.TOKEN_NOT_SET,
        data: {},
      });
    }

    const isTokenValid = this.isTokenValid(tokenDoc, token);
    if (isTokenValid) {
      await this.prismaService.token.update({
        where: {
          id: tokenDoc.id,
        },
        data: {
          used: true,
        },
      });
    }
    return isTokenValid;
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('token', query);
  }

  async findOne(id: string) {
    return await this.prismaService.token.findUnique({
      where: { id },
    });
  }

  async remove(id: string) {
    try {
      return await this.prismaService.token.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('token', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  private generateToken() {
    let token = '';
    for (let i = 0; i < this.lenght; i++) {
      const randomIndex = Math.round(
        Math.random() * (this.possibleChars.length - 1),
      );
      token += this.possibleChars[randomIndex];
    }
    return token;
  }

  isTokenValid(TokenDoc: Token, tokenString: string) {
    return (
      TokenDoc &&
      TokenDoc.createdAt > new Date(Date.now() - this.expiresIn) &&
      TokenDoc.used == false &&
      bcrypt.compareSync(tokenString, TokenDoc.token)
    );
  }
}
