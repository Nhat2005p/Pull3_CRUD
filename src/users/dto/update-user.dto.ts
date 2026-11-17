import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { USER_CONSTRAINTS } from '../constants/user.constants';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Minh Nhat Pro',
    description: 'Tên người dùng mới',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MaxLength(USER_CONSTRAINTS.NAME_MAX_LENGTH, {
    message: `Tên tối đa ${USER_CONSTRAINTS.NAME_MAX_LENGTH} ký tự`,
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Fullstack developer & NestJS enthusiast',
    description: 'Tiểu sử / Giới thiệu bản thân',
  })
  @IsOptional()
  @IsString({ message: 'Bio phải là chuỗi ký tự' })
  bio?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File ảnh đại diện (avatar)',
  })
  @IsOptional()
  avatar?: any;
}
