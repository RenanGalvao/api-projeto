import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, MeUpdateUserDto, UpdateUserDto } from './dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User as Jwt } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Role, User } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@Roles(Role.ADMIN)
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.userService.findAll(query);
  }

  @Roles(Role.VOLUNTEER)
  @Get('me')
  findOneMe(@Jwt() user: User) {
    return this.userService.findOneMe(user);
  }

  @Roles(Role.VOLUNTEER)
  @Put('me')
  updateMe(@Jwt() user: User, @Body() updateUserDto: MeUpdateUserDto) {
    return this.userService.updateMe(user, updateUserDto);
  }

  @Roles(Role.VOLUNTEER)
  @Delete('me')
  removeMe(@Jwt() user: User) {
    return this.userService.removeMe(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.userService.restore(restoreDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.userService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
