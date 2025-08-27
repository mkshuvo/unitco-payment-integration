import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RegisterDto } from './dto/register.dto';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    fullName: 'Test User',
    is_active: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRole = {
    id: 1,
    name: 'USER',
    description: 'Regular user role',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', is_active: 1 },
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        'password123',
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
      });
    });

    it('should return null when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens when login is successful', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ role_name: 'USER' }]),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          roles: ['USER'],
        },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      };

      const hashedPassword = 'hashedpassword123';
      const newUser = {
        ...registerDto,
        password: hashedPassword,
        id: 2,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null); // User doesn't exist
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(argon2.hash).toHaveBeenCalledWith(registerDto.password);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: hashedPassword,
        fullName: registerDto.fullName,
        is_active: 1,
      });
      expect(result).toEqual({
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 1, email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 999, email: 'nonexistent@example.com' };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
