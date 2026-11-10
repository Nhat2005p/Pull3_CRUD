import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAttachmentsAndFollowsTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột bio vào bảng users
    const hasUsersTable = await queryRunner.hasTable('users');
    if (hasUsersTable) {
      const table = await queryRunner.getTable('users');
      const hasBioColumn = table?.findColumnByName('bio');
      if (!hasBioColumn) {
        await queryRunner.query('ALTER TABLE users ADD COLUMN bio TEXT');
      }
    }

    // 2. Tạo bảng attachments (Polymorphic: attachable_type, attachable_id)
    await queryRunner.createTable(
      new Table({
        name: 'attachments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'attachable_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'attachable_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Đánh index cho trường đa hình
    await queryRunner.createIndex(
      'attachments',
      new TableIndex({
        name: 'IDX_ATTACHMENTS_POLYMORPHIC',
        columnNames: ['attachable_type', 'attachable_id'],
      }),
    );

    // 3. Tạo bảng follows
    await queryRunner.createTable(
      new Table({
        name: 'follows',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'follower_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'following_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_FOLLOWER_FOLLOWING',
            columnNames: ['follower_id', 'following_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'follows',
      new TableForeignKey({
        columnNames: ['follower_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'follows',
      new TableForeignKey({
        columnNames: ['following_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('follows');
    await queryRunner.dropTable('attachments');
  }
}
