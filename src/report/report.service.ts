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
import { CreateReportDto, UpdateReportDto } from './dto';

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createReportDto: CreateReportDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createReportDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createReportDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createReportDto,
        field: {
          connect: {
            id: createReportDto.field,
          },
        },
      };
    }

    return await this.prismaService.report.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('report', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.report.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(id: string, user: User, updateReportDto: UpdateReportDto) {
    try {
      if (updateReportDto.field) {
        updateReportDto.field = {
          connect: { id: updateReportDto.field },
        } as any;
      } else {
        delete updateReportDto.field;
      }

      if (user.role !== 'ADMIN') {
        const report = await this.prismaService.report.findFirst({
          where: { id },
        });

        if (!report) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
            data: {},
          });
        } else if (report.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.report.update({
        where: { id },
        data: updateReportDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
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
        const report = await this.prismaService.report.findFirst({
          where: { id },
        });

        if (!report) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
            data: {},
          });
        } else if (report.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.report.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('relatório', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.report.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.report.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
