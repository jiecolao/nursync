import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HashService } from './hash.service';
import * as crypto from 'crypto';
import nodemailer from 'nodemailer';

const permissionSelect = { students_read: true, students_write: true, user_read: true, user_write: true, logs_read: true, logs_write: true } as const;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService, private hashService: HashService) {}

  private hashToken(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }

  private async getClaims(userAccId: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { userAccId },
      include: { role: { include: { role: { include: { permission: true } } } } },
    });
    if (!account || !account.status) throw new UnauthorizedException('Account is disabled or unavailable');
    const role = account.role?.role;
    const permission = role?.permission;
    return {
      sub: account.userAccId,
      email: account.email,
      role: role?.roleName ?? 'Viewer',
      roles: role ? [role.roleName] : [],
      permissions: permission ? {
        students_read: permission.students_read, students_write: permission.students_write,
        user_read: permission.user_read, user_write: permission.user_write,
        logs_read: permission.logs_read, logs_write: permission.logs_write,
      } : { students_read: false, students_write: false, user_read: false, user_write: false, logs_read: false, logs_write: false },
    };
  }

  private async issueTokens(userAccId: string) {
    const payload = await this.getClaims(userAccId);
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: userAccId, email: payload.email, purpose: 'refresh' }, { expiresIn: '7d' });
    await this.prisma.userAccount.update({ where: { userAccId }, data: { hashedRefreshToken: this.hashToken(refreshToken) } });
    return { accessToken, refreshToken, user: { id: userAccId, email: payload.email, role: payload.role, roles: payload.roles, permissions: payload.permissions } };
  }

  async validateAndLogin(email: string, pass: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.status) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await this.hashService.verify(user.hashedPass, pass);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.userAccId);
  }

  async getSession(userAccId: string) {
    const claims = await this.getClaims(userAccId);
    return { user: { id: claims.sub, email: claims.email, role: claims.role, roles: claims.roles, permissions: claims.permissions } };
  }

  async refreshTokens(userAccId: string, incomingRefreshToken: string) {
    let payload: { sub: string; purpose?: string };
    try { payload = this.jwtService.verify(incomingRefreshToken); }
    catch { throw new UnauthorizedException('Invalid refresh token'); }
    if (payload.sub !== userAccId || payload.purpose !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.userAccount.findUnique({ where: { userAccId } });
    if (!user?.hashedRefreshToken) throw new UnauthorizedException('Access denied');
    const incomingHash = this.hashToken(incomingRefreshToken);
    const storedHash = user.hashedRefreshToken;
    if (!/^[a-f0-9]{64}$/.test(storedHash) || !crypto.timingSafeEqual(Buffer.from(incomingHash, 'hex'), Buffer.from(storedHash, 'hex'))) throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(userAccId);
  }

  async logout(userId: string) {
    await this.prisma.userAccount.updateMany({ where: { userAccId: userId }, data: { hashedRefreshToken: null } });
  }

  async requestPasswordReset(email: string) {
    const account = await this.prisma.userAccount.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Always return a challenge token to avoid revealing whether an email exists.
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge = this.jwtService.sign({ purpose: 'password-reset-otp', sub: account?.userAccId ?? 'unknown', email: email.trim().toLowerCase(), codeHash: this.hashToken(code) }, { expiresIn: '10m' });
    if (account && account.status) {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) throw new BadRequestException('Password reset email is not configured');
      const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
      await transport.sendMail({ from: SMTP_FROM || SMTP_USER, to: account.email, subject: 'NurSync password reset code', text: `Your NurSync verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` });
    }
    return challenge;
  }

  async verifyPasswordResetCode(challenge: string | undefined, code: string) {
    if (!challenge) throw new UnauthorizedException('Verification code is invalid or expired');
    let payload: { purpose: string; sub: string; codeHash: string };
    try { payload = this.jwtService.verify(challenge); } catch { throw new UnauthorizedException('Verification code is invalid or expired'); }
    if (payload.purpose !== 'password-reset-otp' || payload.sub === 'unknown' || !/^\d{6}$/.test(code) || !crypto.timingSafeEqual(Buffer.from(this.hashToken(code), 'hex'), Buffer.from(payload.codeHash, 'hex'))) throw new UnauthorizedException('Verification code is invalid or expired');
    return this.jwtService.sign({ purpose: 'password-reset', sub: payload.sub }, { expiresIn: '10m' });
  }

  async resetPassword(resetToken: string | undefined, password: string) {
    if (!resetToken) throw new UnauthorizedException('Reset session expired');
    let payload: { purpose: string; sub: string };
    try { payload = this.jwtService.verify(resetToken); } catch { throw new UnauthorizedException('Reset session expired'); }
    if (payload.purpose !== 'password-reset' || password.length < 12 || password.length > 128 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9\W]/.test(password)) throw new BadRequestException('Invalid reset request or password does not meet requirements');
    const hashedPass = await this.hashService.hash(password);
    await this.prisma.userAccount.update({ where: { userAccId: payload.sub }, data: { hashedPass, hashedRefreshToken: null } });
  }
}
