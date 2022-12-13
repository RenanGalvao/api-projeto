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
import { CreateMonthlyMiscOfferDto, UpdateMonthlyMiscOfferDto } from './dto';

@Injectable()
export class MonthlyMiscOfferService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: User,
    createMonthlyMiscOfferDto: CreateMonthlyMiscOfferDto,
  ) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createMonthlyMiscOfferDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createMonthlyMiscOfferDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createMonthlyMiscOfferDto,
        field: {
          connect: {
            id: createMonthlyMiscOfferDto.field,
          },
        },
      };
    }

    return await this.prismaService.monthlyMiscOffer.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('monthlyMiscOffer', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.monthlyMiscOffer.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateMonthlyMiscOfferDto: UpdateMonthlyMiscOfferDto,
  ) {
    try {
      if (updateMonthlyMiscOfferDto.field) {
        updateMonthlyMiscOfferDto.field = {
          connect: { id: updateMonthlyMiscOfferDto.field },
        } as any;
      } else {
        delete updateMonthlyMiscOfferDto.field;
      }

      if (user.role !== 'ADMIN') {
        const monthlyMiscOffer =
          await this.prismaService.monthlyMiscOffer.findFirst({
            where: { id },
          });

        if (!monthlyMiscOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
            data: {},
          });
        } else if (monthlyMiscOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyMiscOffer.update({
        where: { id },
        data: updateMonthlyMiscOfferDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
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
        const monthlyMiscOffer =
          await this.prismaService.monthlyMiscOffer.findFirst({
            where: { id },
          });

        if (!monthlyMiscOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
            data: {},
          });
        } else if (monthlyMiscOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyMiscOffer.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('oferta diversa mensal', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.monthlyMiscOffer.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.monthlyMiscOffer.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
