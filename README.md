# Pull 3 - Các API còn lại của User & Polymorphic Attachments (Upload Local)

## Các nội dung đã thực hiện:

### 1. Database Migrations & Entities:
- Tạo Migration `1700000000002-CreateAttachmentsAndFollowsTable.ts`:
  - Bổ sung cột `bio` vào bảng `users`.
  - Tạo bảng `attachments` quản lý tệp tin theo hướng **đa hình (polymorphic)**:
    - `id`: chuỗi **UUID** (`varchar(36)`) chống scan ID.
    - `attachable_type`: kiểu đối tượng sở hữu (`'User'`,...).
    - `attachable_id`: ID của đối tượng sở hữu.
    - `url`: đường dẫn file.
    - `file_name`, `file_type`, `file_size`.
    - Index đa hình: `IDX_ATTACHMENTS_POLYMORPHIC` (`attachable_type`, `attachable_id`).
  - Tạo bảng `follows` (`follower_id`, `following_id`, unique constraint và cascade delete).

### 2. Logic Upload tệp (Avatar) ở Local:
- Hỗ trợ cả 2 hướng theo yêu cầu:
  - **Hướng Public:** Cấu hình `ServeStaticModule` phục vụ folder `uploads/avatars` tại route `/public/avatars`, cho phép client truy cập avatar trực tiếp qua URL.
  - **Hướng Private:** Cung cấp API `GET /api/attachments/:id` có kiểm tra `JwtAuthGuard` để phân quyền và xác thực trước khi trả về file.

### 3. Các API User:
- `PATCH /api/users/me`: **Update User** - Cập nhật `name`, `bio` và upload file `avatar` (lưu trữ local bằng Multer, sinh UUID filename).
- `GET /api/users/:id/profile`: **Get Profile** - Xem thông tin trang cá nhân, avatar, số lượng `followersCount`, `followingCount` và trạng thái `isFollowing`.
- `POST /api/users/:id/follow`: **Follow user** - Theo dõi một user (chặn tự follow chính mình, chặn follow trùng lặp).
- `DELETE /api/users/:id/unfollow`: **Unfollow user** - Hủy theo dõi một user.

### 4. Kiểm thử tự động:
- `npm run lint`: Prettier check & `tsc --noEmit` pass 100%.
- `npm run build`: Biên dịch NestJS thành công.
- `npm test`: Pass toàn bộ Unit Tests (`app`, `auth`, `users`).
- `npm run test:e2e`: Pass 9/9 E2E tests (luồng Auth, Update User Avatar, Public/Private attachment access, Get Profile, Follow/Unfollow).
