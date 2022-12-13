import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateMonthlyFoodOfferDto, UpdateMonthlyFoodOfferDto } from './dto';

@Injectable()
export class MonthlyFoodOfferService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: User,
    createMonthlyFoodOfferDto: CreateMonthlyFoodOfferDto,
  ) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createMonthlyFoodOfferDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createMonthlyFoodOfferDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createMonthlyFoodOfferDto,
        field: {
          connect: {
            id: createMonthlyFoodOfferDto.field,
          },
        },
      };
    }

    return await this.prismaService.monthlyFoodOffer.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('monthlyFoodOffer', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.monthlyFoodOffer.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateMonthlyFoodOfferDto: UpdateMonthlyFoodOfferDto,
  ) {
    try {
      if (updateMonthlyFoodOfferDto.field) {
        updateMonthlyFoodOfferDto.field = {
          connect: { id: updateMonthlyFoodOfferDto.field },
        } as any;
      } else {
        delete updateMonthlyFoodOfferDto.field;
      }

      if (user.role !== 'ADMIN') {
        const monthlyFoodOffer =
          await this.prismaService.monthlyFoodOffer.findFirst({
            where: { id },
          });

        if (!monthlyFoodOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta alimentícia mensal',
              'a',
            ),
            data: {},
          });
        } else if (monthlyFoodOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyFoodOffer.update({
        where: { id },
        data: updateMonthlyFoodOfferDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta alimentícia mensal',
              'a',
            ),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string, user: User) {
    try {
      if (user.role !== 'ADMIN') {
        const monthlyFoodOffer =
          await this.prismaService.monthlyFoodOffer.findFirst({
            where: { id },
          });

        if (!monthlyFoodOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta alimentícia mensal',
              'a',
            ),
            data: {},
          });
        } else if (monthlyFoodOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyFoodOffer.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta alimentícia mensal',
              'a',
            ),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.monthlyFoodOffer.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.monthlyFoodOffer.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
