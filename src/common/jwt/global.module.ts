import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailService } from "../services/email/email.service";

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [EmailService],
  exports: [JwtModule, EmailService],
})
export class GlobalJwtModule {}
