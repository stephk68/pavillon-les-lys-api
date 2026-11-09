import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Un seul PrismaService pour toute l'application. Avant, chaque module le
 * déclarait dans ses providers : ~12 instances, donc ~12 pools de connexions
 * PostgreSQL ouverts en parallèle.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
