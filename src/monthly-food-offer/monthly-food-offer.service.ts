import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateMonthlyFoodOfferDto, UpdateMonthlyFoodOfferDto } from './dto';

@Injectable()
export class MonthlyFoodOfferService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createMonthlyFoodOfferDto: CreateMonthlyFoodOfferDto) {
    return await this.prismaService.monthlyFoodOffer.create({
      data: {
        ...createMonthlyFoodOfferDto,
        field: {
          connect: {
            id: createMonthlyFoodOfferDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('monthlyFoodOffer', query);
  }

  async findOne(id: string) {
    return await this.prismaService.monthlyFoodOffer.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
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

      return await this.prismaService.monthlyFoodOffer.update({
        where: { id },
        data: updateMonthlyFoodOfferDto as any,
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

  async remove(id: string) {
    try {
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
