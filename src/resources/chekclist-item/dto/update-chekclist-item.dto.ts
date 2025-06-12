import { PartialType } from '@nestjs/mapped-types';
import { CreateChekclistItemDto } from './create-chekclist-item.dto';

export class UpdateChekclistItemDto extends PartialType(CreateChekclistItemDto) {}
