import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateVolunteerDto, UpdateVolunteerDto } from './dto';

@Injectable()
export class VolunteerService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createVolunteerDto: CreateVolunteerDto) {
    return await this.prismaService.volunteer.create({
      data: {
        ...createVolunteerDto,
        field: {
          connect: {
            id: createVolunteerDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('volunteer', query);
  }

  async findOne(id: string) {
    return await this.prismaService.volunteer.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateVolunteerDto: UpdateVolunteerDto) {
    try {
      if (updateVolunteerDto.field) {
        updateVolunteerDto.field = {
          connect: { id: updateVolunteerDto.field },
        } as any;
      } else {
        delete updateVolunteerDto.field;
      }

      return await this.prismaService.volunteer.update({
        where: { id },
        data: updateVolunteerDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('voluntário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.volunteer.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('voluntário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.volunteer.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.volunteer.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
