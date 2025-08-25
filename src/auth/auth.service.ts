import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { UserToken } from '../entities/user-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
    @InjectRepository(UserToken) private readonly userTokens: Repository<UserToken>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const allowPublic = this.config.get('ALLOW_PUBLIC_REGISTRATION');
    const nodeEnv = this.config.get('NODE_ENV');

    // Gate public registration unless explicitly allowed or in development
    if (!(allowPublic === 'true' || nodeEnv === 'development')) {
      throw new ForbiddenException('Public registration is disabled');
    }

    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const password_hash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19MB
      timeCost: 2,
      parallelism: 1,
    });

    const user = this.users.create({
      email: dto.email,
      password_hash,
      full_name: dto.fullName ?? null,
      is_active: 1,
    });
    const saved = await this.users.save(user);

    // Assign default USER role
    let role = await this.roles.findOne({ where: { name: 'USER' } });
    if (!role) {
      role = await this.roles.save(
        this.roles.create({ name: 'USER', description: 'Standard user', is_system: 1 as any }),
      );
    }
    const ur = this.userRoles.create({ user_id: saved.id, role_id: role.id });
    await this.userRoles.save(ur);

    return { id: saved.id, email: saved.email, fullName: saved.full_name };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await argon2.verify(user.password_hash, dto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user roles
    const roles = await this.roles
      .createQueryBuilder('role')
      .innerJoin('user_roles', 'ur', 'ur.role_id = role.id')
      .where('ur.user_id = :userId', { userId: user.id })
      .select(['role.name'])
      .getRawMany();

    const roleNames = roles.map((r) => r.role_name);

    // Generate tokens
    const payload = { sub: user.id, email: user.email, roles: roleNames };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m',
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store refresh token
    const tokenEntity = this.userTokens.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      type: 'REFRESH',
      expires_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      user_agent: userAgent,
      ip,
    });
    await this.userTokens.save(tokenEntity);

    // Update last login
    await this.users.update(user.id, { last_login_time: new Date() });

    return {
      user: { id: user.id, email: user.email, roles: roleNames },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, userAgent?: string, ip?: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const tokenEntity = await this.userTokens.findOne({
      where: {
        token_hash: tokenHash,
        type: 'REFRESH',
        is_revoked: 0,
      },
    });

    if (!tokenEntity || !tokenEntity.expires_time || tokenEntity.expires_time < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findOne({
      where: { id: tokenEntity.user_id, is_active: 1 },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old token
    await this.userTokens.update(tokenEntity.id, {
      is_revoked: 1,
      revoked_time: new Date(),
    });

    // Get user roles
    const roles = await this.roles
      .createQueryBuilder('role')
      .innerJoin('user_roles', 'ur', 'ur.role_id = role.id')
      .where('ur.user_id = :userId', { userId: user.id })
      .select(['role.name'])
      .getRawMany();

    const roleNames = roles.map((r) => r.role_name);

    // Generate new tokens
    const payload = { sub: user.id, email: user.email, roles: roleNames };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m',
    });

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Store new refresh token
    const newTokenEntity = this.userTokens.create({
      user_id: user.id,
      token_hash: newRefreshTokenHash,
      type: 'REFRESH',
      expires_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      user_agent: userAgent,
      ip,
    });
    await this.userTokens.save(newTokenEntity);

    return {
      user: { id: user.id, email: user.email, roles: roleNames },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    await this.userTokens.update(
      { token_hash: tokenHash, type: 'REFRESH' },
      { is_revoked: 1, revoked_time: new Date() }
    );

    return { success: true };
  }

  async revokeAllTokens(userId: number) {
    await this.userTokens.update(
      { user_id: userId, type: 'REFRESH', is_revoked: 0 },
      { is_revoked: 1, revoked_time: new Date() }
    );

    return { success: true };
  }
}
