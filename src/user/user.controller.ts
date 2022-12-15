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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  User as Jwt,
} from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Role, User } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@ApiTags('User')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiCreatedResponse(CreateUserDto)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiResponse(CreateUserDto, { paginated: true })
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.userService.findAll(query);
  }

  @ApiResponse(CreateUserDto)
  @Roles(Role.VOLUNTEER)
  @Get('me')
  findOneMe(@Jwt() user: User) {
    return this.userService.findOneMe(user);
  }

  @ApiResponse(CreateUserDto)
  @Roles(Role.VOLUNTEER)
  @Put('me')
  updateMe(@Jwt() user: User, @Body() updateUserDto: MeUpdateUserDto) {
    return this.userService.updateMe(user, updateUserDto);
  }

  @ApiResponse(CreateUserDto)
  @Roles(Role.VOLUNTEER)
  @Delete('me')
  removeMe(@Jwt() user: User) {
    return this.userService.removeMe(user);
  }

  @ApiResponse(CreateUserDto)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiBatchResponse()
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.userService.restore(restoreDto);
  }

  @ApiResponse(CreateUserDto)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @ApiBatchResponse()
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.userService.hardRemove(hardRemoveDto);
  }

  @ApiResponse(CreateUserDto)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
