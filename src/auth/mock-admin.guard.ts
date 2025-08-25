import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MockAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const isProd =
      (this.config.get<string>('NODE_ENV') || 'production') === 'production';

    // In production, require header x-admin=1. In non-prod, allow by default.
    if (!isProd) return true;

    const header = req.headers['x-admin'];
    if (header === '1' || header === 1) return true;

    throw new UnauthorizedException('Admin access required');
  }
}
