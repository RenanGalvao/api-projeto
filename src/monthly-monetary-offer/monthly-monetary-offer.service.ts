import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
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

  async create(createMonthlyMonetaryOfferDto: CreateMonthlyMonetaryOfferDto) {
    return await this.prismaService.monthlyMonetaryOffer.create({
      data: {
        ...createMonthlyMonetaryOfferDto,
        field: {
          connect: {
            id: createMonthlyMonetaryOfferDto.field,
          },
        },
      },
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

      return await this.prismaService.monthlyMonetaryOffer.update({
        where: { id },
        data: updateMonthlyMonetaryOfferDto as any,
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

  async remove(id: string) {
    try {
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
