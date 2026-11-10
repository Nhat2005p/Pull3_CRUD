import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 1,
    name: 'Minh Nhat',
    email: 'nhat@example.com',
    password: 'hashedPassword',
    bio: 'NestJS Trainee',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTargetUser: User = {
    id: 2,
    name: 'Trainer Binh',
    email: 'binh@example.com',
    password: 'hashedPassword',
    bio: 'Mentor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
  };

  const mockFollowRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
    remove: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockAttachmentsService = {
    createAttachment: jest.fn().mockResolvedValue({
      id: 'uuid-1234',
      url: '/public/avatars/test.jpg',
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024,
    }),
    findByAttachable: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: mockFollowRepository,
        },
        {
          provide: AttachmentsService,
          useValue: mockAttachmentsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('updateUser', () => {
    it('should update name and bio successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.updateUser(1, {
        name: 'Minh Nhat Updated',
        bio: 'Updated Bio',
      });

      expect(result.name).toBe('Minh Nhat Updated');
      expect(result.bio).toBe('Updated Bio');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should attach avatar when file is uploaded', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });

      const fakeFile = {
        filename: 'avatar.jpg',
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      } as Express.Multer.File;

      const result = await service.updateUser(1, {}, fakeFile);

      expect(mockAttachmentsService.createAttachment).toHaveBeenCalledWith(
        fakeFile,
        'User',
        1,
      );
      expect(result.avatar).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return user profile with followersCount and followingCount', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockFollowRepository.count
        .mockResolvedValueOnce(5) // followersCount
        .mockResolvedValueOnce(3); // followingCount

      const profile = await service.getProfile(1);

      expect(profile.email).toBe('nhat@example.com');
      expect(profile.followersCount).toBe(5);
      expect(profile.followingCount).toBe(3);
    });
  });

  describe('followUser', () => {
    it('should follow a user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockTargetUser);
      mockFollowRepository.findOne.mockResolvedValue(null);

      const result = await service.followUser(1, 2);

      expect(result.message).toContain('thành công');
      expect(mockFollowRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if self-following', async () => {
      await expect(service.followUser(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if already following', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockTargetUser);
      mockFollowRepository.findOne.mockResolvedValue({ id: 10 });

      await expect(service.followUser(1, 2)).rejects.toThrow(ConflictException);
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockTargetUser);
      mockFollowRepository.findOne.mockResolvedValue({ id: 10 });

      const result = await service.unfollowUser(1, 2);

      expect(result.message).toContain('thành công');
      expect(mockFollowRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not following yet', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockTargetUser);
      mockFollowRepository.findOne.mockResolvedValue(null);

      await expect(service.unfollowUser(1, 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
