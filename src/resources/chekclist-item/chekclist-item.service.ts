import { Injectable } from '@nestjs/common';
import { CreateChekclistItemDto } from './dto/create-chekclist-item.dto';
import { UpdateChekclistItemDto } from './dto/update-chekclist-item.dto';

@Injectable()
export class ChekclistItemService {
  create(createChekclistItemDto: CreateChekclistItemDto) {
    return 'This action adds a new chekclistItem';
  }

  findAll() {
    return `This action returns all chekclistItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chekclistItem`;
  }

  update(id: number, updateChekclistItemDto: UpdateChekclistItemDto) {
    return `This action updates a #${id} chekclistItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} chekclistItem`;
  }
}
