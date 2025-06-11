import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../../resources/user/user.module';
import { AuthenticationGuard } from './authentication.guard';
import { AuthorizationGuard } from './authorization.guard';
import { OwnerOrAdminGuard } from './owner.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    UserModule,
  ],
  providers: [AuthenticationGuard, AuthorizationGuard, OwnerOrAdminGuard],
  exports: [AuthenticationGuard, AuthorizationGuard, OwnerOrAdminGuard],
})
export class GuardsModule {}
