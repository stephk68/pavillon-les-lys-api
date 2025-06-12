import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChekclistItemService } from './chekclist-item.service';
import { CreateChekclistItemDto } from './dto/create-chekclist-item.dto';
import { UpdateChekclistItemDto } from './dto/update-chekclist-item.dto';

@Controller('chekclist-item')
export class ChekclistItemController {
  constructor(private readonly chekclistItemService: ChekclistItemService) {}

  @Post()
  create(@Body() createChekclistItemDto: CreateChekclistItemDto) {
    return this.chekclistItemService.create(createChekclistItemDto);
  }

  @Get()
  findAll() {
    return this.chekclistItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chekclistItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChekclistItemDto: UpdateChekclistItemDto) {
    return this.chekclistItemService.update(+id, updateChekclistItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chekclistItemService.remove(+id);
  }
}
