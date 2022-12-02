import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateAgendaDto,UpdateAgendaDto } from './dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createAgendaDto: CreateAgendaDto) {
    return await this.prismaService.agenda.create({
      data: {
        ...createAgendaDto,
        field: {
          connect: {
            id: createAgendaDto.field,
          }
        }
      }
    })
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('agenda', query);
  }

  async findOne(id: string) {
    return await this.prismaService.agenda.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateAgendaDto: UpdateAgendaDto) {
    try {
      if (updateAgendaDto.field) {
        updateAgendaDto.field = {
          connect: { id: updateAgendaDto.field },
        } as any;
      } else {
        delete updateAgendaDto.field;
      }

      return await this.prismaService.agenda.update({
        where: { id },
        data: updateAgendaDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.agenda.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.agenda.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.agenda.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
