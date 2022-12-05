import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateOfferorFamilyDto, UpdateOfferorFamilyDto } from './dto';

@Injectable()
export class OfferorFamilyService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createOfferorFamilyDto: CreateOfferorFamilyDto) {
    return await this.prismaService.offerorFamily.create({
      data: {
        ...createOfferorFamilyDto,
        field: {
          connect: {
            id: createOfferorFamilyDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('offerorFamily', query);
  }

  async findOne(id: string) {
    return await this.prismaService.offerorFamily.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateOfferorFamilyDto: UpdateOfferorFamilyDto) {
    try {
      if (updateOfferorFamilyDto.field) {
        updateOfferorFamilyDto.field = {
          connect: { id: updateOfferorFamilyDto.field },
        } as any;
      } else {
        delete updateOfferorFamilyDto.field;
      }

      return await this.prismaService.offerorFamily.update({
        where: { id },
        data: updateOfferorFamilyDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.offerorFamily.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.offerorFamily.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.offerorFamily.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
