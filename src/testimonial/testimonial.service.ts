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
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';

@Injectable()
export class TestimonialService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User, createTestimonialDto: CreateTestimonialDto) {
    let dataObj = {};

    if (user.role !== 'ADMIN') {
      dataObj = {
        ...createTestimonialDto,
        field: {
          connect: {
            id: user.fieldId,
          },
        },
      };
    } else {
      if (!createTestimonialDto.field) {
        throw new BadRequestException({
          message: TEMPLATE.VALIDATION.IS_NOT_EMPTY('field'),
          data: {},
        });
      }

      dataObj = {
        ...createTestimonialDto,
        field: {
          connect: {
            id: createTestimonialDto.field,
          },
        },
      };
    }

    return await this.prismaService.testimonial.create({
      data: dataObj as any,
      include: { field: true },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('testimonial', query, {
      include: { field: true },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.testimonial.findUnique({
      where: { id },
      include: { field: true },
    });
  }

  async update(
    id: string,
    user: User,
    updateTestimonialDto: UpdateTestimonialDto,
  ) {
    try {
      if (updateTestimonialDto.field) {
        updateTestimonialDto.field = {
          connect: { id: updateTestimonialDto.field },
        } as any;
      } else {
        delete updateTestimonialDto.field;
      }

      if (user.role !== 'ADMIN') {
        const testimonial = await this.prismaService.testimonial.findFirst({
          where: { id },
        });

        if (!testimonial) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
            data: {},
          });
        } else if (testimonial.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.testimonial.update({
        where: { id },
        data: updateTestimonialDto as any,
        include: { field: true },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
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
        const testimonial = await this.prismaService.testimonial.findFirst({
          where: { id },
        });

        if (!testimonial) {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
            data: {},
          });
        } else if (testimonial.fieldId !== user.fieldId) {
          throw new ForbiddenException({
            message: MESSAGE.EXCEPTION.FORBIDDEN,
            data: {},
          });
        }
      }

      return await this.prismaService.testimonial.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('testemunho', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.testimonial.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.testimonial.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
