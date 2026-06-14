import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import {
  CreateQuoteDefaultItemDto,
  UpdateQuoteDefaultItemDto,
} from "./dto/quote-default-item.dto";

@Injectable()
export class QuoteDefaultItemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste des libellés par défaut. Par défaut, seuls les actifs, triés par
   * displayOrder. `includeInactive` permet à l'admin de tout voir/gérer.
   */
  findAll(includeInactive = false) {
    return this.prisma.quoteDefaultItem.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.quoteDefaultItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Élément par défaut ${id} introuvable`);
    }
    return item;
  }

  create(dto: CreateQuoteDefaultItemDto) {
    return this.prisma.quoteDefaultItem.create({
      data: {
        label: dto.label,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateQuoteDefaultItemDto) {
    await this.findOne(id);
    return this.prisma.quoteDefaultItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quoteDefaultItem.delete({ where: { id } });
  }
}
