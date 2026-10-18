import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HashService } from './hash.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private hashService: HashService
  ) {}

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // -------------------------------------------------------------
  // Auth Flows
  // -------------------------------------------------------------
  async validateAndLogin(email: string, pass: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 1. Verify password using argon
    const isMatch = await this.hashService.verify(user.hashedPass, pass)
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    // 2. Generate tokens
    const payload = { 
      sub: user.userAccId, 
      email: user.email 
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // 3. Fast hash the refresh token with SHA-256 and persist
    const hashedRefreshToken = this.hashToken(refreshToken);
    await this.prisma.userAccount.update({
      where: { userAccId: user.userAccId },
      data: { hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
      user: { 
        id: user.userAccId, 
        email: user.email 
      },
    };
  }

  async refreshTokens(userAccId: string, incomingRefreshToken: string) {
    const user = await this.prisma.userAccount.findUnique({
      where: { userAccId: userAccId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Hash incoming token and compare using timing-safe buffer comparison
    const incomingHash = this.hashToken(incomingRefreshToken);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(incomingHash, 'hex'),
      Buffer.from(user.hashedRefreshToken, 'hex'),
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token rotation: Issue new token pair and update hash
    const payload = { 
      sub: user.userAccId, 
      email: user.email 
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.userAccount.update({
      where: { userAccId: user.userAccId },
      data: { hashedRefreshToken: this.hashToken(newRefreshToken) },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    // Invalidate the session in MySQL
    await this.prisma.userAccount.updateMany({
      where: { userAccId: userId, hashedRefreshToken: { not: null } },
      data: { hashedRefreshToken: null },
    });
  }
}