import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import {
  CreateQuoteDefaultItemDto,
  UpdateQuoteDefaultItemDto,
} from "./dto/quote-default-item.dto";
import { QuoteDefaultItemService } from "./quote-default-item.service";

@Controller("quote-default-items")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Roles(Role.ADMIN, Role.EVENT_MANAGER)
export class QuoteDefaultItemController {
  constructor(
    private readonly quoteDefaultItemService: QuoteDefaultItemService,
  ) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.quoteDefaultItemService.findAll(includeInactive === "true");
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteDefaultItemService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuoteDefaultItemDto) {
    return this.quoteDefaultItemService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDefaultItemDto,
  ) {
    return this.quoteDefaultItemService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteDefaultItemService.remove(id);
  }
}
