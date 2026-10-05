import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';

// Shared secure cookie settings
const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; pass: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.validateAndLogin(body.email, body.pass);

    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'Logged in successfully', user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read the incoming refresh token from cookies (requires cookie-parser)
    const incomingRefreshToken = req.cookies?.['refresh_token'];
    if (!incomingRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Decode user payload without full verification, or pass through a dedicated RefreshGuard
    const payload = req['user'] as { sub: string } | undefined;
    
    // If not using a passport refresh guard, extract userId from service-level verification or token payload
    const userId = payload?.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token session');
    }

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      userId,
      incomingRefreshToken,
    );

    // Overwrite cookies with rotated tokens
    this.setAuthCookies(res, accessToken, refreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Clear cookies immediately from client
    res.clearCookie('access_token', BASE_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', BASE_COOKIE_OPTIONS);

    // req.user is guaranteed by JwtAuthGuard
    const user = req.user as { sub: string };
    if (user?.sub) {
      await this.authService.logout(user.sub);
    }

    return { message: 'Logged out successfully' };
  }

  // -------------------------------------------------------------
  // Private Helper
  // -------------------------------------------------------------
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}