import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateReportDto, UpdateReportDto } from './dto';

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createReportDto: CreateReportDto) {
    return await this.prismaService.report.create({
      data: {
        ...createReportDto,
        field: {
          connect: {
            id: createReportDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('report', query);
  }

  async findOne(id: string) {
    return await this.prismaService.report.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateReportDto: UpdateReportDto) {
    try {
      if (updateReportDto.field) {
        updateReportDto.field = {
          connect: { id: updateReportDto.field },
        } as any;
      } else {
        delete updateReportDto.field;
      }

      return await this.prismaService.report.update({
        where: { id },
        data: updateReportDto as any,
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

  async remove(id: string) {
    try {
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
