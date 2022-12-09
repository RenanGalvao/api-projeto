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
import { CreateAssistedFamilyDto, UpdateAssistedFamilyDto } from './dto';

@Injectable()
export class AssistedFamilyService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createAssistedFamilyDto: CreateAssistedFamilyDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createAssistedFamilyDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createAssistedFamilyDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createAssistedFamilyDto,
        field: {
          connect: {
            id: createAssistedFamilyDto.field,
          },
        },
      };
    }

    return await this.prismaService.assistedFamily.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('assistedFamily', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.assistedFamily.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateAssistedFamilyDto: UpdateAssistedFamilyDto,
  ) {
    try {
      if (updateAssistedFamilyDto.field) {
        updateAssistedFamilyDto.field = {
          connect: { id: updateAssistedFamilyDto.field },
        } as any;
      } else {
        delete updateAssistedFamilyDto.field;
      }

      if (user.role !== 'ADMIN') {
        const event = await this.prismaService.assistedFamily.findFirst({
          where: { id },
        });

        if (!event) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
            data: {},
          });
        } else if (event.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.assistedFamily.update({
        where: { id },
        data: updateAssistedFamilyDto as any,
        include: { field: true },
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

  async remove(id: string, user: User) {
    try {
      if (user.role !== 'ADMIN') {
        const event = await this.prismaService.assistedFamily.findFirst({
          where: { id },
        });

        if (!event) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família assistida', 'a'),
            data: {},
          });
        } else if (event.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

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
