import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    return await this.prismaService.announcement.create({
      data: {
        ...createAnnouncementDto,
        field: {
          connect: {
            id: createAnnouncementDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('announcement', query);
  }

  async findOne(id: string) {
    return await this.prismaService.announcement.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto) {
    try {
      if (updateAnnouncementDto.field) {
        updateAnnouncementDto.field = {
          connect: { id: updateAnnouncementDto.field },
        } as any;
      } else {
        delete updateAnnouncementDto.field;
      }

      return await this.prismaService.announcement.update({
        where: { id },
        data: updateAnnouncementDto as any,
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

  async remove(id: string) {
    try {
      return await this.prismaService.announcement.delete({
        where: { id },
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
