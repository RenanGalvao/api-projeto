import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { LocalAuthGuard } from './local';
import { AuthService } from 'src/auth/auth.service';
import { Public, ApiController, User as Jwt } from 'src/utils';
import { LoginResponse } from './entities';
import { SendRecoverEmailDto, NewPasswordDto } from 'src/mail/dto';
import { User } from '@prisma/client';
import { RefreshJwtAuthGuard } from './refresh-jwt';
import { Throttle } from '@nestjs/throttler';
import { HOUR_IN_SECS } from 'src/constants';
import { TokenValidateDto } from './dto';

@ApiController('Login', [LoginResponse])
@Throttle(3, HOUR_IN_SECS)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle(10, HOUR_IN_SECS)
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin(@Jwt() user: User) {
    return this.authService.signin(user);
  }

  @Public()
  @Post('recover-email/confirm')
  confirmRecoverEmail(@Body() newPassword: NewPasswordDto) {
    return this.authService.confirmRecoverEmail(newPassword);
  }

  @Public()
  @Post('token-validate')
  tokenValidate(@Body() tokenValidateDto: TokenValidateDto) {
    const { email, token } = tokenValidateDto;
    return this.authService.tokenValidate(email, token);
  }

  @Public()
  @Post('recover-email')
  sendRecoverEmail(@Body() sendRecoverEmailDto: SendRecoverEmailDto) {
    return this.authService.sendRecoverEmail(sendRecoverEmailDto);
  }

  @Throttle(10, HOUR_IN_SECS)
  @Public()
  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  refresh(@Jwt() user: User, @Jwt('refreshToken') refreshToken: string) {
    return this.authService.refresh(user, refreshToken);
  }

  @Throttle(10, HOUR_IN_SECS)
  @Post('logout')
  logout(@Jwt() user: User) {
    return this.authService.logout(user);
  }
}
