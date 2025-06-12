import { Module } from '@nestjs/common';
import { ChekclistItemService } from './chekclist-item.service';
import { ChekclistItemController } from './chekclist-item.controller';

@Module({
  controllers: [ChekclistItemController],
  providers: [ChekclistItemService],
})
export class ChekclistItemModule {}
