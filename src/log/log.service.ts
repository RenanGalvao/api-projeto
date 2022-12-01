import { Injectable, Query } from '@nestjs/common';
import { PaginationDto } from 'src/prisma/dto';
import { CreateLogDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@Injectable()
export class LogService {
  constructor(private prismaService: PrismaService) {}

  async create(payload: CreateLogDto) {
    const { user, ...payloadData } = payload;
    const userObj = !user ? undefined : { connect: { id: user.id } };
    try {
      await this.prismaService.log.create({
        data: {
          ...payloadData,
          user: userObj,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        // User Not Found, Log Without User
        if (error.code === 'P2025') {
          await this.prismaService.log.create({
            data: payloadData,
          });
        }
      }
    }
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('log', query, {
      include: {
        user: {
          select: {
            firstName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.log.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.log.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async clean() {
    const deleteQuery = this.prismaService.log.deleteMany();
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.log.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
