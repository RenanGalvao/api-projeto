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
import {
  CreateMonthlyMonetaryOfferDto,
  UpdateMonthlyMonetaryOfferDto,
} from './dto';

@Injectable()
export class MonthlyMonetaryOfferService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: User,
    createMonthlyMonetaryOfferDto: CreateMonthlyMonetaryOfferDto,
  ) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createMonthlyMonetaryOfferDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createMonthlyMonetaryOfferDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createMonthlyMonetaryOfferDto,
        field: {
          connect: {
            id: createMonthlyMonetaryOfferDto.field,
          },
        },
      };
    }

    return await this.prismaService.monthlyMonetaryOffer.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery(
      'monthlyMonetaryOffer',
      query,
    );
  }

  async findOne(id: string) {
    return await this.prismaService.monthlyMonetaryOffer.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    user: User,
    updateMonthlyMonetaryOfferDto: UpdateMonthlyMonetaryOfferDto,
  ) {
    try {
      if (updateMonthlyMonetaryOfferDto.field) {
        updateMonthlyMonetaryOfferDto.field = {
          connect: { id: updateMonthlyMonetaryOfferDto.field },
        } as any;
      } else {
        delete updateMonthlyMonetaryOfferDto.field;
      }

      if (user.role !== 'ADMIN') {
        const monthlyMonetaryOffer =
          await this.prismaService.monthlyMonetaryOffer.findFirst({
            where: { id },
          });

        if (!monthlyMonetaryOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta monetária mensal',
              'a',
            ),
            data: {},
          });
        } else if (monthlyMonetaryOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyMonetaryOffer.update({
        where: { id },
        data: updateMonthlyMonetaryOfferDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta monetária mensal',
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
        const monthlyMonetaryOffer =
          await this.prismaService.monthlyMonetaryOffer.findFirst({
            where: { id },
          });

        if (!monthlyMonetaryOffer) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta monetária mensal',
              'a',
            ),
            data: {},
          });
        } else if (monthlyMonetaryOffer.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.monthlyMonetaryOffer.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND(
              'oferta monetária mensal',
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
    return await this.prismaService.monthlyMonetaryOffer.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.monthlyMonetaryOffer.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
