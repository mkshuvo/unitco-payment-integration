import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    roles: ['USER'],
  };

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };

      mockAuthService.login.mockResolvedValue(mockTokens);

      const mockResponse = {
        cookie: jest.fn(),
      };

      const result = await controller.login(loginDto, mockResponse as any);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: mockUser,
        message: 'Login successful',
      });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      const mockResponse = {
        cookie: jest.fn(),
      };

      await expect(
        controller.login(loginDto, mockResponse as any),
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

      const mockNewUser = {
        id: 2,
        email: registerDto.email,
        fullName: registerDto.fullName,
      };

      mockAuthService.register.mockResolvedValue(mockNewUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockNewUser);
    });

    it('should handle registration errors', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const result = await controller.getCurrentUser(mockUser as any);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'valid-refresh-token',
        },
      };

      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockNewTokens);

      const mockResponse = {
        cookie: jest.fn(),
      };

      const result = await controller.refreshToken(
        mockRequest as any,
        mockResponse as any,
      );

      expect(authService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Tokens refreshed successfully' });
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
      const mockRequest = {
        cookies: {},
      };

      const mockResponse = {
        cookie: jest.fn(),
      };

      await expect(
        controller.refreshToken(mockRequest as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      };

      const result = await controller.logout(mockResponse as any);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
