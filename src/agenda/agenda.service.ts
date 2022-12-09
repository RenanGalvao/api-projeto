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
import { CreateAgendaDto, UpdateAgendaDto } from './dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createAgendaDto: CreateAgendaDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createAgendaDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createAgendaDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createAgendaDto,
        field: {
          connect: {
            id: createAgendaDto.field,
          },
        },
      };
    }

    return await this.prismaService.agenda.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('agenda', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.agenda.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(id: string, user: User, updateAgendaDto: UpdateAgendaDto) {
    try {
      if (updateAgendaDto.field) {
        updateAgendaDto.field = {
          connect: { id: updateAgendaDto.field },
        } as any;
      } else {
        delete updateAgendaDto.field;
      }

      if (user.role !== 'ADMIN') {
        const event = await this.prismaService.agenda.findFirst({
          where: { id },
        });

        if (!event) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
            data: {},
          });
        } else if (event.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.agenda.update({
        where: { id },
        data: updateAgendaDto as any,
        include: { field: true },
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

  async remove(id: string, user: User) {
    try {
      if (user.role !== 'ADMIN') {
        const event = await this.prismaService.agenda.findFirst({
          where: { id },
        });

        if (!event) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('evento', 'o'),
            data: {},
          });
        } else if (event.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

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
