import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    // Không quăng lỗi Unauthorized nếu không có token hoặc token không hợp lệ
    return user || null;
  }
}
