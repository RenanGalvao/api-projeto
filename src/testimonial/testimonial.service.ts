import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';

@Injectable()
export class TestimonialService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createTestimonialDto: CreateTestimonialDto) {
    return await this.prismaService.testimonial.create({
      data: {
        ...createTestimonialDto,
        field: {
          connect: {
            id: createTestimonialDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('testimonial', query);
  }

  async findOne(id: string) {
    return await this.prismaService.testimonial.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateTestimonialDto: UpdateTestimonialDto) {
    try {
      if (updateTestimonialDto.field) {
        updateTestimonialDto.field = {
          connect: { id: updateTestimonialDto.field },
        } as any;
      } else {
        delete updateTestimonialDto.field;
      }

      return await this.prismaService.testimonial.update({
        where: { id },
        data: updateTestimonialDto as any,
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

  async remove(id: string) {
    try {
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
