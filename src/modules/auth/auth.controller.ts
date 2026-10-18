import { BadRequestException, Body, Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Response, Request, CookieOptions } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';

const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private jwtService: JwtService) {}

  @Post('login')
  async login(@Body() body: { email: string; password?: string; pass?: string }, @Res({ passthrough: true }) res: Response) {
    if (!body.email || !(body.password ?? body.pass)) throw new BadRequestException('Email and password are required');
    const { accessToken, refreshToken, user } = await this.authService.validateAndLogin(body.email, body.password ?? body.pass!);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Logged in successfully', user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.authService.getSession(user.sub);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('Refresh token missing');
    let payload: { sub: string; purpose?: string };
    try { payload = this.jwtService.verify(token); } catch { throw new UnauthorizedException('Invalid refresh token'); }
    if (payload.purpose !== 'refresh' || !payload.sub) throw new UnauthorizedException('Invalid refresh token');
    const { accessToken, refreshToken } = await this.authService.refreshTokens(payload.sub, token);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Tokens refreshed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { sub: string };
    await this.authService.logout(user.sub);
    res.clearCookie('access_token', BASE_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', BASE_COOKIE_OPTIONS);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }, @Res({ passthrough: true }) res: Response) {
    if (!body.email) throw new BadRequestException('Email is required');
    const challenge = await this.authService.requestPasswordReset(body.email);
    res.cookie('password_reset_challenge', challenge, { ...BASE_COOKIE_OPTIONS, maxAge: 10 * 60 * 1000 });
    return { message: 'If an account exists for that email, a verification code has been sent.' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { code: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const resetToken = await this.authService.verifyPasswordResetCode(req.cookies?.password_reset_challenge, body.code);
    res.clearCookie('password_reset_challenge', BASE_COOKIE_OPTIONS);
    res.cookie('password_reset_token', resetToken, { ...BASE_COOKIE_OPTIONS, maxAge: 10 * 60 * 1000 });
    return { message: 'Verification successful' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.resetPassword(req.cookies?.password_reset_token, body.password);
    res.clearCookie('password_reset_token', BASE_COOKIE_OPTIONS);
    res.clearCookie('access_token', BASE_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', BASE_COOKIE_OPTIONS);
    return { message: 'Password reset successfully. Please sign in.' };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, { ...BASE_COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...BASE_COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}
