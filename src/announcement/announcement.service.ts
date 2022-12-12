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
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createAnnouncementDto: CreateAnnouncementDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createAnnouncementDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createAnnouncementDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createAnnouncementDto,
        field: {
          connect: {
            id: createAnnouncementDto.field,
          },
        },
      };
    }

    return await this.prismaService.announcement.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('announcement', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.announcement.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateAnnouncementDto: UpdateAnnouncementDto,
  ) {
    try {
      if (updateAnnouncementDto.field) {
        updateAnnouncementDto.field = {
          connect: { id: updateAnnouncementDto.field },
        } as any;
      } else {
        delete updateAnnouncementDto.field;
      }

      if (user.role !== 'ADMIN') {
        const announcement = await this.prismaService.announcement.findFirst({
          where: { id },
        });

        if (!announcement) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
            data: {},
          });
        } else if (announcement.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.announcement.update({
        where: { id },
        data: updateAnnouncementDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
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
        const announcement = await this.prismaService.announcement.findFirst({
          where: { id },
        });

        if (!announcement) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
            data: {},
          });
        } else if (announcement.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.announcement.delete({
        where: { id },
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('anúncio', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.announcement.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.announcement.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
