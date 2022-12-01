import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: async (configService: ConfigService) =>
        configService.get('multer'),
      inject: [ConfigService],
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
