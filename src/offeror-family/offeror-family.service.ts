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
import { CreateOfferorFamilyDto, UpdateOfferorFamilyDto } from './dto';

@Injectable()
export class OfferorFamilyService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createOfferorFamilyDto: CreateOfferorFamilyDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createOfferorFamilyDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createOfferorFamilyDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createOfferorFamilyDto,
        field: {
          connect: {
            id: createOfferorFamilyDto.field,
          },
        },
      };
    }

    return await this.prismaService.offerorFamily.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('offerorFamily', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.offerorFamily.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateOfferorFamilyDto: UpdateOfferorFamilyDto,
  ) {
    try {
      if (updateOfferorFamilyDto.field) {
        updateOfferorFamilyDto.field = {
          connect: { id: updateOfferorFamilyDto.field },
        } as any;
      } else {
        delete updateOfferorFamilyDto.field;
      }

      if (user.role !== 'ADMIN') {
        const offerorFamily = await this.prismaService.offerorFamily.findFirst({
          where: { id },
        });

        if (!offerorFamily) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
            data: {},
          });
        } else if (offerorFamily.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.offerorFamily.update({
        where: { id },
        data: updateOfferorFamilyDto as any,
        include: { field: true },
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

  async remove(id: string, user: User) {
    try {
      if (user.role !== 'ADMIN') {
        const offerorFamily = await this.prismaService.offerorFamily.findFirst({
          where: { id },
        });

        if (!offerorFamily) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('família ofertante', 'a'),
            data: {},
          });
        } else if (offerorFamily.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

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
