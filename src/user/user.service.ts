import { ConflictException, Injectable, NotFoundException, Query } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, MeUpdateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { PrismaUtils } from 'src/utils';
import { TEMPLATE } from 'src/constants';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    try {
      const newUser = await this.prismaService.user.create({
        data: {
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          email: createUserDto.email,
          role: createUserDto.role ? createUserDto.role : Role.USER,
          avatar: createUserDto.avatar,
          lastAccess: new Date(),
          hashedPassword: bcrypt.hashSync(createUserDto.password, bcrypt.genSaltSync()),
        },
      });

      return PrismaUtils.exclude(newUser, 'hashedPassword', 'hashedRefreshToken', 'deleted');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException({
            message: TEMPLATE.EXCEPTION.CONFLICT('E-mail', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('user', query, {
      excludeKeys: ['hashedPassword', 'hashedRefreshToken'],
    });
  }

  async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });
    return PrismaUtils.exclude(user, 'hashedPassword', 'hashedRefreshToken', 'deleted');
  }

  async findByEmailAuth(email: string): Promise<User | null> {
    return await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prismaService.user.update({
        where: { id },
        data: updateUserDto,
      });
      return PrismaUtils.exclude(user, 'hashedPassword', 'hashedRefreshToken', 'deleted');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async updateLastAccess(id: string): Promise<void> {
    try {
      await this.prismaService.user.update({
        where: {
          id,
        },
        data: {
          lastAccess: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async updatePasswordByEmail(email: string, password: string): Promise<void> {
    try {
      await this.prismaService.user.update({
        where: { email },
        data: {
          hashedPassword: bcrypt.hashSync(password, bcrypt.genSaltSync()),
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const user = await this.prismaService.user.delete({
        where: { id },
      });
      return PrismaUtils.exclude(user, 'hashedPassword', 'hashedRefreshToken', 'deleted');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async findOneMe(user: User) {
    const userMe = await this.prismaService.user.findUnique({
      where: { id: user.id },
    });
    return PrismaUtils.exclude(userMe, 'hashedPassword', 'hashedRefreshToken', 'deleted');
  }

  async updateMe(user: User, updateUserDto: MeUpdateUserDto) {
    if (updateUserDto.password) {
      const hashedPassword = bcrypt.hashSync(updateUserDto.password, bcrypt.genSaltSync());
      delete updateUserDto.password;
      (updateUserDto as any).hashedPassword = hashedPassword;
    }

    try {
      const userMe = await this.prismaService.user.update({
        where: { id: user.id },
        data: updateUserDto,
      });
      return PrismaUtils.exclude(userMe, 'hashedPassword', 'hashedRefreshToken', 'deleted');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async removeMe(user: User) {
    try {
      const userMe = await this.prismaService.user.delete({
        where: { id: user.id },
      });
      return PrismaUtils.exclude(userMe, 'hashedPassword', 'hashedRefreshToken', 'deleted');
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('usuário', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.user.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids }
      }
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.user.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids }
      }
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
