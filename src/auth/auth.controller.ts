import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, Get, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Audit } from '../audit/decorators/audit.decorator';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;
    
    const result = await this.authService.login(dto, userAgent, ip);

    // Set httpOnly cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;
    
    const result = await this.authService.refresh(refreshToken, userAgent, ip);

    // Set new httpOnly cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { ok: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'USER_LOGOUT', resourceType: 'auth' })
  async logout(
    @CurrentUser() user: User & { roles: string[] },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.revokeAllTokens(user.id);
    
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User & { roles: string[] }): Promise<{ id: number; email: string; roles: string[] }> {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }
}
