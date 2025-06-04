import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService], // Exporter le service pour l'utiliser dans d'autres modules
})
export class UserModule {}
