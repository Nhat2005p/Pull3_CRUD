import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AbstractLoader } from '@nestjs/serve-static/dist/loaders/abstract.loader';
import { ExpressLoader } from '@nestjs/serve-static/dist/loaders/express.loader';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RedisService } from '../src/redis/redis.service';

describe('User APIs & Attachments Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let user1Token: string;
  let user1Id: number;
  let user2Token: string;
  let user2Id: number;
  let avatarAttachmentId: string;

  const mockBlacklist = new Set<string>();
  const mockRedisService = {
    setBlacklistToken: jest.fn().mockImplementation(async (token: string) => {
      mockBlacklist.add(`blacklist:${token}`);
    }),
    isTokenBlacklisted: jest.fn().mockImplementation(async (token: string) => {
      return mockBlacklist.has(`blacklist:${token}`);
    }),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(AbstractLoader)
      .useClass(ExpressLoader)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.dropDatabase();
    }
    await app.close();
  });

  it('Setup: Register & Login User 1 and User 2', async () => {
    // Register User 1
    const reg1 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'user1@example.com',
        name: 'User One',
        password: 'password123',
      })
      .expect(201);
    user1Id = reg1.body.id;

    // Login User 1
    const login1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'password123',
      })
      .expect(200);
    user1Token = login1.body.accessToken;

    // Register User 2
    const reg2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'user2@example.com',
        name: 'User Two',
        password: 'password123',
      })
      .expect(201);
    user2Id = reg2.body.id;

    // Login User 2
    const login2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'user2@example.com',
        password: 'password123',
      })
      .expect(200);
    user2Token = login2.body.accessToken;
  });

  it('/api/users/me (PATCH) - Reject invalid file upload (XSS/HTML prevention)', async () => {
    const maliciousHtml = Buffer.from('<script>alert("xss")</script>');

    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .attach('avatar', maliciousHtml, {
        filename: 'malicious.html',
        contentType: 'text/html',
      })
      .expect(400);
  });

  it('/api/users/me (PATCH) - Update User with name, bio and avatar upload (Multer) & never leak password', async () => {
    const fakeImageBuffer = Buffer.from('fake-image-binary-data');

    const res = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('name', 'User One Updated')
      .field('bio', 'Software Engineer & NestJS Developer')
      .attach('avatar', fakeImageBuffer, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(res.body.name).toBe('User One Updated');
    expect(res.body.bio).toBe('Software Engineer & NestJS Developer');
    expect(res.body.avatar).toBeDefined();
    expect(res.body.avatar.id).toBeDefined();
    expect(res.body.avatar.url).toContain('/public/avatars/');
    // Kiểm tra đuôi file do server tạo dựa trên MIME (png -> .png)
    expect(res.body.avatar.url).toMatch(/\.png$/);

    // Không bao giờ trả về hash password
    expect(res.body.password).toBeUndefined();
    expect(res.body).not.toHaveProperty('password');

    avatarAttachmentId = res.body.avatar.id;
  });

  it('/public/avatars/:file (GET) - Public access to uploaded avatar file via ServeStaticModule', async () => {
    const profile = await request(app.getHttpServer())
      .get(`/api/users/${user1Id}/profile`)
      .expect(200);

    const avatarUrl = profile.body.avatar.url;

    // Truy cập trực tiếp qua ServeStaticModule (không qua endpoint controller thủ công)
    await request(app.getHttpServer()).get(avatarUrl).expect(200);
  });

  it('Path traversal protection: removed manual endpoints & directory traversal is blocked', async () => {
    // Đảm bảo endpoint cũ không còn tồn tại và không cho phép path traversal
    await request(app.getHttpServer())
      .get('/api/avatars/..%2F..%2Fpackage.json')
      .expect(404);
  });

  it('/api/attachments/:id (GET) - Private access to attachment with auth verification', async () => {
    // 401 if unauthorized
    await request(app.getHttpServer())
      .get(`/api/attachments/${avatarAttachmentId}`)
      .expect(401);

    // 200 with Bearer Token
    await request(app.getHttpServer())
      .get(`/api/attachments/${avatarAttachmentId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
  });

  it('/api/users/:id/profile (GET) - Get Profile without password and with follower counts', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/users/${user1Id}/profile`)
      .expect(200);

    expect(res.body.id).toBe(user1Id);
    expect(res.body.email).toBe('user1@example.com');
    expect(res.body.followersCount).toBe(0);
    expect(res.body.followingCount).toBe(0);
    expect(res.body.isFollowing).toBe(false);

    // Tuyệt đối không trả về hash password cho public profile
    expect(res.body.password).toBeUndefined();
    expect(res.body).not.toHaveProperty('password');
  });

  it('/api/users/:id/follow (POST) - Follow User (User 2 follows User 1)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    expect(res.body.message).toContain('thành công');

    // Check profile follower count
    const profile = await request(app.getHttpServer())
      .get(`/api/users/${user1Id}/profile`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);
    expect(profile.body.followersCount).toBe(1);
    expect(profile.body.isFollowing).toBe(true);
  });

  it('/api/users/:id/follow (POST) - Reject duplicate follow with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(409);
  });

  it('/api/users/:id/follow (POST) - Reject self-following with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(400);
  });

  it('/api/users/:id/unfollow (DELETE) - Unfollow User (User 2 unfollows User 1)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/users/${user1Id}/unfollow`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    expect(res.body.message).toContain('thành công');

    // Check profile follower count decreased to 0
    const profile = await request(app.getHttpServer())
      .get(`/api/users/${user1Id}/profile`)
      .expect(200);
    expect(profile.body.followersCount).toBe(0);
  });
});
