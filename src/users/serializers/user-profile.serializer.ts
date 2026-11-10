import { Exclude, Expose, Type } from 'class-transformer';

export class AttachmentResponseDto {
  @Expose()
  id: string;

  @Expose()
  url: string;

  @Expose()
  fileName: string;

  @Expose()
  fileType: string;

  @Expose()
  fileSize: number;
}

export class UserProfileResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  bio?: string;

  @Expose()
  @Type(() => AttachmentResponseDto)
  avatar?: AttachmentResponseDto;

  @Expose()
  followersCount: number;

  @Expose()
  followingCount: number;

  @Expose()
  isFollowing?: boolean;

  @Expose()
  createdAt: Date;

  @Exclude()
  password?: string;
}
