import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfileResponseDto } from './serializers/user-profile.serializer';
import { UsersService } from './users.service';

const uploadDir = path.join(process.cwd(), 'uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const uniqueName = `${uuidv4()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update User (Cập nhật thông tin & upload avatar lưu local)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: UserProfileResponseDto,
  })
  async updateCurrentUser(
    @Req() req: Request & { user: User },
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    return this.usersService.updateUser(req.user.id, updateUserDto, avatar);
  }

  @Get(':id/profile')
  @ApiOperation({
    summary:
      'Get Profile (Xem thông tin trang cá nhân và avatar, số follower/following)',
  })
  @ApiParam({ name: 'id', description: 'ID của user', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Thông tin profile user',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User không tồn tại' })
  async getProfile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<UserProfileResponseDto> {
    const currentUserId = (req as any).user?.id;
    return this.usersService.getProfile(id, currentUserId);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow user (Theo dõi một user)' })
  @ApiParam({
    name: 'id',
    description: 'ID của user muốn theo dõi',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Theo dõi thành công',
    schema: { example: { message: 'Theo dõi người dùng thành công' } },
  })
  @ApiResponse({ status: 400, description: 'Không thể tự theo dõi chính mình' })
  @ApiResponse({ status: 409, description: 'Đã theo dõi người dùng này rồi' })
  async followUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    return this.usersService.followUser(req.user.id, id);
  }

  @Delete(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow user (Hủy theo dõi một user)' })
  @ApiParam({
    name: 'id',
    description: 'ID của user muốn hủy theo dõi',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy theo dõi thành công',
    schema: { example: { message: 'Hủy theo dõi người dùng thành công' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể hủy theo dõi chính mình',
  })
  @ApiResponse({ status: 404, description: 'Chưa theo dõi người dùng này' })
  async unfollowUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    return this.usersService.unfollowUser(req.user.id, id);
  }
}
