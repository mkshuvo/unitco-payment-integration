import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { UserRole } from '../src/entities/user-role.entity';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await dataSource.getRepository(UserRole).delete({});
    await dataSource.getRepository(User).delete({});
    await dataSource.getRepository(Role).delete({});
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      // First create a USER role
      const userRole = dataSource.getRepository(Role).create({
        name: 'USER',
        description: 'Regular user role',
      });
      await dataSource.getRepository(Role).save(userRole);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: registerDto.email,
        fullName: registerDto.fullName,
      });
      expect(response.body.password).toBeUndefined();
    });

    it('should reject duplicate email registration', async () => {
      // Create a USER role
      const userRole = dataSource.getRepository(Role).create({
        name: 'USER',
        description: 'Regular user role',
      });
      await dataSource.getRepository(Role).save(userRole);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email should fail
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a USER role and test user
      const userRole = dataSource.getRepository(Role).create({
        name: 'USER',
        description: 'Regular user role',
      });
      await dataSource.getRepository(Role).save(userRole);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: expect.any(Number),
          email: loginDto.email,
          roles: ['USER'],
        },
        message: 'Login successful',
      });

      // Check that cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(
        cookies.some((cookie: string) => cookie.includes('accessToken')),
      ).toBe(true);
      expect(
        cookies.some((cookie: string) => cookie.includes('refreshToken')),
      ).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a USER role and test user
      const userRole = dataSource.getRepository(Role).create({
        name: 'USER',
        description: 'Regular user role',
      });
      await dataSource.getRepository(Role).save(userRole);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];
      const accessTokenCookie = cookies.find((cookie: string) =>
        cookie.includes('accessToken'),
      );
      accessToken = accessTokenCookie.split('=')[1].split(';')[0];
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `accessToken=${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: 'test@example.com',
        roles: ['USER'],
      });
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', 'accessToken=invalid-token')
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logged out successfully',
      });

      // Check that cookies are cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(
        cookies.some((cookie: string) => cookie.includes('accessToken=;')),
      ).toBe(true);
      expect(
        cookies.some((cookie: string) => cookie.includes('refreshToken=;')),
      ).toBe(true);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration -> login -> access protected route -> logout flow', async () => {
      // Create a USER role
      const userRole = dataSource.getRepository(Role).create({
        name: 'USER',
        description: 'Regular user role',
      });
      await dataSource.getRepository(Role).save(userRole);

      // 1. Register
      const registerDto = {
        email: 'flowtest@example.com',
        password: 'password123',
        fullName: 'Flow Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // 2. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const accessTokenCookie = cookies.find((cookie: string) =>
        cookie.includes('accessToken'),
      );
      const accessToken = accessTokenCookie.split('=')[1].split(';')[0];

      // 3. Access protected route
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `accessToken=${accessToken}`)
        .expect(200);

      // 4. Logout
      await request(app.getHttpServer()).post('/auth/logout').expect(200);

      // 5. Verify access is revoked (token should still work until expiry, but cookies are cleared)
      // This tests the logout cookie clearing functionality
      const logoutResponse = await request(app.getHttpServer()).post(
        '/auth/logout',
      );

      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(
        logoutCookies.some((cookie: string) =>
          cookie.includes('accessToken=;'),
        ),
      ).toBe(true);
    });
  });
});
