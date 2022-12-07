import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateMonthlyMiscOfferDto, UpdateMonthlyMiscOfferDto } from './dto';

@Injectable()
export class MonthlyMiscOfferService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createMonthlyMiscOfferDto: CreateMonthlyMiscOfferDto) {
    return await this.prismaService.monthlyMiscOffer.create({
      data: {
        ...createMonthlyMiscOfferDto,
        field: {
          connect: {
            id: createMonthlyMiscOfferDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('monthlyMiscOffer', query);
  }

  async findOne(id: string) {
    return await this.prismaService.monthlyMiscOffer.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
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

      return await this.prismaService.monthlyMiscOffer.update({
        where: { id },
        data: updateMonthlyMiscOfferDto as any,
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

  async remove(id: string) {
    try {
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
