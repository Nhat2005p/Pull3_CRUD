import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
  ) {}

  async createAttachment(
    file: Express.Multer.File,
    attachableType: string,
    attachableId: number,
  ): Promise<Attachment> {
    const url = `/public/avatars/${file.filename}`;

    const attachment = this.attachmentRepository.create({
      attachableType,
      attachableId,
      url,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });

    return this.attachmentRepository.save(attachment);
  }

  async findByAttachable(
    attachableType: string,
    attachableId: number,
  ): Promise<Attachment | null> {
    return this.attachmentRepository.findOne({
      where: { attachableType, attachableId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.attachmentRepository.findOne({ where: { id } });
  }
}
