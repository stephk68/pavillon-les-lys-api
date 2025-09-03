import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { FirstLoginPasswordDto } from "./dto/first-login-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Route publique pour l'inscription
  @Public()
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Route publique pour la connexion
  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Route publique pour la demande de réinitialisation de mot de passe
  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // Route publique pour la réinitialisation de mot de passe
  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // Route protégée pour obtenir le profil de l'utilisateur connecté
  @UseGuards(AuthenticationGuard)
  @Get("profile")
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  // Route protégée pour rafraîchir le token
  @UseGuards(AuthenticationGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.id);
  }

  // Route protégée pour la déconnexion
  @UseGuards(AuthenticationGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  // Route protégée pour valider le token (utile pour vérifier si l'utilisateur est toujours connecté)
  @UseGuards(AuthenticationGuard)
  @Get("validate")
  async validateToken(@CurrentUser() user: any) {
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // Route protégée pour changer le mot de passe lors de la première connexion
  @UseGuards(AuthenticationGuard)
  @Post("change-password-first-login")
  @HttpCode(HttpStatus.OK)
  async changePasswordFirstLogin(
    @CurrentUser() user: any,
    @Body() firstLoginPasswordDto: FirstLoginPasswordDto
  ) {
    return this.authService.changePasswordFirstLogin(
      user.id,
      firstLoginPasswordDto
    );
  }

  // Route protégée pour changer le mot de passe
  @UseGuards(AuthenticationGuard)
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }
}
