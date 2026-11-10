import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';

@ApiTags('Attachments')
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('public/avatars/:filename')
  @ApiOperation({
    summary: 'Public endpoint truy cập avatar',
  })
  @ApiParam({ name: 'filename', description: 'Tên file avatar' })
  async getPublicAvatar(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(process.cwd(), 'uploads/avatars', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại');
    }
    return res.sendFile(filePath);
  }

  @Get('avatars/:filename')
  @ApiOperation({
    summary: 'Public endpoint truy cập avatar (dưới prefix api)',
  })
  @ApiParam({ name: 'filename', description: 'Tên file avatar' })
  async getPublicAvatarUnderApi(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(process.cwd(), 'uploads/avatars', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại');
    }
    return res.sendFile(filePath);
  }

  @Get('attachments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'API Private lấy tệp đính kèm có xác thực và phân quyền',
  })
  @ApiParam({ name: 'id', description: 'UUID của attachment' })
  @ApiResponse({ status: 200, description: 'Trả về file binary' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async getPrivateAttachment(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentsService.findById(id);
    if (!attachment) {
      throw new NotFoundException('Attachment không tồn tại');
    }

    const filename = path.basename(attachment.url);
    const filePath = path.join(process.cwd(), 'uploads/avatars', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại trên hệ thống');
    }

    res.setHeader('Content-Type', attachment.fileType);
    return res.sendFile(filePath);
  }
}
