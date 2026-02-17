import { Module } from "@nestjs/common";
import { UserModule } from "../../resources/user/user.module";
import { AuthenticationGuard } from "./authentication.guard";
import { AuthorizationGuard } from "./authorization.guard";
import { OwnerOrAdminGuard } from "./owner.guard";

@Module({
  imports: [UserModule],
  providers: [AuthenticationGuard, AuthorizationGuard, OwnerOrAdminGuard],
  exports: [AuthenticationGuard, AuthorizationGuard, OwnerOrAdminGuard],
})
export class GuardsModule {}
