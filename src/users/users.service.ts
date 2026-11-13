import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Người dùng có ID ${id} không tồn tại`);
    }
    return user;
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    avatarFile?: Express.Multer.File,
  ): Promise<any> {
    const user = await this.findById(id);

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.bio !== undefined) {
      user.bio = updateUserDto.bio;
    }

    const savedUser = await this.userRepository.save(user);

    let avatarAttachment = null;
    if (avatarFile) {
      avatarAttachment = await this.attachmentsService.createAttachment(
        avatarFile,
        'User',
        user.id,
      );
    } else {
      avatarAttachment = await this.attachmentsService.findByAttachable(
        'User',
        user.id,
      );
    }

    return {
      ...savedUser,
      avatar: avatarAttachment,
    };
  }

  async getProfile(targetUserId: number, currentUserId?: number): Promise<any> {
    const user = await this.findById(targetUserId);

    const followersCount = await this.followRepository.count({
      where: { followingId: targetUserId },
    });

    const followingCount = await this.followRepository.count({
      where: { followerId: targetUserId },
    });

    let isFollowing = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const follow = await this.followRepository.findOne({
        where: { followerId: currentUserId, followingId: targetUserId },
      });
      isFollowing = !!follow;
    }

    const avatarAttachment = await this.attachmentsService.findByAttachable(
      'User',
      targetUserId,
    );

    return {
      ...user,
      avatar: avatarAttachment,
      followersCount,
      followingCount,
      isFollowing,
    };
  }

  async followUser(
    currentUserId: number,
    targetUserId: number,
  ): Promise<{ message: string }> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Bạn không thể tự theo dõi chính mình');
    }

    await this.findById(targetUserId);

    const existingFollow = await this.followRepository.findOne({
      where: { followerId: currentUserId, followingId: targetUserId },
    });

    if (existingFollow) {
      throw new ConflictException('Bạn đã theo dõi người dùng này rồi');
    }

    const follow = this.followRepository.create({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    await this.followRepository.save(follow);

    return {
      message: 'Theo dõi người dùng thành công',
    };
  }

  async unfollowUser(
    currentUserId: number,
    targetUserId: number,
  ): Promise<{ message: string }> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Bạn không thể hủy theo dõi chính mình');
    }

    await this.findById(targetUserId);

    const follow = await this.followRepository.findOne({
      where: { followerId: currentUserId, followingId: targetUserId },
    });

    if (!follow) {
      throw new NotFoundException('Bạn chưa theo dõi người dùng này');
    }

    await this.followRepository.remove(follow);

    return {
      message: 'Hủy theo dõi người dùng thành công',
    };
  }
}
