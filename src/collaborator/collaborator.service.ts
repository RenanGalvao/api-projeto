import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateCollaboratorDto, UpdateCollaboratorDto } from './dto';

@Injectable()
export class CollaboratorService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCollaboratorDto: CreateCollaboratorDto) {
    return await this.prismaService.collaborator.create({
      data: {
        ...createCollaboratorDto,
        field: {
          connect: {
            id: createCollaboratorDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('collaborator', query);
  }

  async findOne(id: string) {
    return await this.prismaService.collaborator.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateCollaboratorDto: UpdateCollaboratorDto) {
    try {
      if (updateCollaboratorDto.field) {
        updateCollaboratorDto.field = {
          connect: { id: updateCollaboratorDto.field },
        } as any;
      } else {
        delete updateCollaboratorDto.field;
      }

      return await this.prismaService.collaborator.update({
        where: { id },
        data: updateCollaboratorDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.collaborator.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('colaborador', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.collaborator.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.collaborator.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
