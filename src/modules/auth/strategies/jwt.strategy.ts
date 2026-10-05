import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Extract JWT from the 'access_token' HTTP-only cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['access_token'];
          }
          return token;
        },
        // Fallback: Also support standard Bearer header if ever needed
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-fallback-secret-key',
    });
  }

  // Whatever is returned here is automatically attached to `req.user`
  async validate(payload: { sub: string; email: string }) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, email: payload.email };
  }
}