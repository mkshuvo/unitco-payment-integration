import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'dev-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<User & { roles: string[] }> {
    const user = await this.users.findOne({
      where: { id: payload.sub, is_active: 1 },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Get user roles
    const userRoles = await this.userRoles.find({
      where: { user_id: user.id },
      relations: ['role'],
    });

    const roles = await this.roles
      .createQueryBuilder('role')
      .innerJoin('user_roles', 'ur', 'ur.role_id = role.id')
      .where('ur.user_id = :userId', { userId: user.id })
      .select(['role.name'])
      .getRawMany();

    const roleNames = roles.map((r) => r.role_name);

    return { ...user, roles: roleNames };
  }
}
