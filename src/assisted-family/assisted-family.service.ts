import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateAssistedFamilyDto, UpdateAssistedFamilyDto } from './dto';

@Injectable()
export class AssistedFamilyService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAssistedFamilyDto: CreateAssistedFamilyDto) {
    return await this.prismaService.assistedFamily.create({
      data: {
        ...createAssistedFamilyDto,
        field: {
          connect: {
            id: createAssistedFamilyDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('assistedFamily', query);
  }

  async findOne(id: string) {
    return await this.prismaService.assistedFamily.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateAssistedFamilyDto: UpdateAssistedFamilyDto) {
    try {
      if (updateAssistedFamilyDto.field) {
        updateAssistedFamilyDto.field = {
          connect: { id: updateAssistedFamilyDto.field },
        } as any;
      } else {
        delete updateAssistedFamilyDto.field;
      }

      return await this.prismaService.assistedFamily.update({
        where: { id },
        data: updateAssistedFamilyDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.assistedFamily.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.assistedFamily.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.assistedFamily.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
