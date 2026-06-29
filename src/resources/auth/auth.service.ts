import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/services/prisma.service";
import { MailService } from "../../mail/mail.service";
import { UserService } from "../user/user.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CheckIdentityDto } from "./dto/check-identity.dto";
import { FirstLoginPasswordDto } from "./dto/first-login-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SetFirstPasswordDto } from "./dto/set-first-password.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException("Un utilisateur avec cet email existe déjà");
    }

    // Créer l'utilisateur
    const user = await this.userService.register(registerDto);

    // Générer le token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Envoyer l'email de bienvenue (fire-and-forget)
    this.mailService.sendWelcomeEmail(user).catch(() => {});

    return {
      user,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    // Trouver l'utilisateur par email
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    // Vérifier le mot de passe
    const isPasswordValid = await this.userService.validatePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    // Vérifier que le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException(
        "Ce compte a été désactivé. Veuillez contacter un administrateur.",
      );
    }

    // Mettre à jour la dernière connexion
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Générer le token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: token,
      isFirstLogin: user.isFirstLogin,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.userService.findOne(userId);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Ne pas révéler que l'email n'existe pas pour des raisons de sécurité
      return {
        message:
          "Si cet email existe, un lien de réinitialisation a été envoyé",
      };
    }

    // Générer un token de réinitialisation
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: "password-reset" },
      { expiresIn: "1h" },
    );

    // Stocker le hash du token en base pour pouvoir le révoquer
    const hashedToken = await bcrypt.hash(resetToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 heure
      },
    });

    // Envoyer l'email avec le token de réinitialisation (fire-and-forget)
    this.mailService.sendPasswordResetEmail(user, resetToken).catch(() => {});

    return {
      message: "Si cet email existe, un lien de réinitialisation a été envoyé",
      // En développement seulement
      resetToken:
        process.env.NODE_ENV === "development" ? resetToken : undefined,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      // Vérifier le token JWT
      const payload = this.jwtService.verify(resetPasswordDto.token);

      if (payload.type !== "password-reset") {
        throw new BadRequestException("Token de réinitialisation invalide");
      }

      // Vérifier que le token correspond à celui stocké en base
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.resetToken || !user.resetTokenExpiry) {
        throw new BadRequestException("Token de réinitialisation invalide");
      }

      if (new Date() > user.resetTokenExpiry) {
        throw new BadRequestException("Token de réinitialisation expiré");
      }

      const isTokenValid = await bcrypt.compare(
        resetPasswordDto.token,
        user.resetToken,
      );
      if (!isTokenValid) {
        throw new BadRequestException("Token de réinitialisation invalide");
      }

      // Mettre à jour le mot de passe et invalider le token
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        resetPasswordDto.newPassword,
        saltRounds,
      );

      const updatedUser = await this.prisma.user.update({
        where: { id: payload.sub },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Envoyer l'email de confirmation (fire-and-forget)
      this.mailService
        .sendPasswordChangedConfirmation(updatedUser)
        .catch(() => {});

      return { message: "Mot de passe réinitialisé avec succès" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Token de réinitialisation invalide ou expiré",
      );
    }
  }

  async validateUser(userId: string) {
    return this.userService.findOne(userId);
  }

  async logout(userId: string) {
    // Si vous utilisez une blacklist de tokens, ajoutez-le ici
    // await this.addTokenToBlacklist(token);

    return { message: "Déconnexion réussie" };
  }

  async getProfile(userId: string) {
    return this.userService.findOne(userId);
  }

  async changePasswordFirstLogin(
    userId: string,
    firstLoginPasswordDto: FirstLoginPasswordDto,
  ) {
    // Vérifier que les mots de passe correspondent
    if (
      firstLoginPasswordDto.newPassword !==
      firstLoginPasswordDto.confirmPassword
    ) {
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      firstLoginPasswordDto.newPassword,
      saltRounds,
    );

    // Mettre à jour le mot de passe et marquer que ce n'est plus la première connexion
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
        updatedBy: userId,
      },
    });

    // Envoyer l'email de confirmation (fire-and-forget)
    this.mailService
      .sendPasswordChangedConfirmation(updatedUser)
      .catch(() => {});

    return { message: "Mot de passe modifié avec succès" };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    // Vérifier que les mots de passe correspondent
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }

    // Vérifier le mot de passe actuel
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("Utilisateur introuvable");
    }
    const isCurrentValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      throw new BadRequestException("Le mot de passe actuel est incorrect");
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    // Mettre à jour le mot de passe
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedBy: userId,
      },
    });

    // Envoyer l'email de confirmation (fire-and-forget)
    this.mailService
      .sendPasswordChangedConfirmation(updatedUser)
      .catch(() => {});

    return { message: "Mot de passe modifié avec succès" };
  }

  // ==================== IDENTITY-FIRST FLOW ====================

  async checkIdentity(checkIdentityDto: CheckIdentityDto) {
    const user = await this.userService.findByEmail(checkIdentityDto.email);

    if (!user) {
      return { status: "UNKNOWN" };
    }

    if (user.isFirstLogin) {
      // Générer un code OTP à 6 chiffres
      const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHashed = await bcrypt.hash(otpPlain, 10);

      // Stocker le hash avec expiration 10 minutes
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otpHashed,
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Envoyer l'email OTP (fire-and-forget)
      this.mailService.sendOtpCode(user, otpPlain).catch(() => {});

      return { status: "REGISTERED_FIRST_LOGIN" };
    }

    return { status: "REGISTERED_READY" };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.userService.findByEmail(verifyOtpDto.email);

    if (!user || !user.otpCode || !user.otpExpiry) {
      throw new UnauthorizedException("Code OTP invalide ou expiré");
    }

    if (new Date() > user.otpExpiry) {
      // Nettoyer les champs expirés
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiry: null },
      });
      throw new UnauthorizedException("Code OTP expiré");
    }

    const isOtpValid = await bcrypt.compare(verifyOtpDto.otp, user.otpCode);
    if (!isOtpValid) {
      throw new UnauthorizedException("Code OTP invalide");
    }

    // Invalider le code OTP après utilisation
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null },
    });

    // Générer un token temporaire (15 min) qui prouve la vérification OTP
    const tempToken = this.jwtService.sign(
      { sub: user.id, type: "otp-verified" },
      { expiresIn: "15m" },
    );

    return { tempToken };
  }

  async setFirstPassword(setFirstPasswordDto: SetFirstPasswordDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(setFirstPasswordDto.tempToken);
    } catch {
      throw new BadRequestException("Token temporaire invalide ou expiré");
    }

    if (payload.type !== "otp-verified") {
      throw new BadRequestException("Token temporaire invalide");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new BadRequestException("Utilisateur introuvable");
    }

    if (!user.isFirstLogin) {
      throw new BadRequestException(
        "Compte déjà initialisé — utilisez la connexion classique",
      );
    }

    const hashedPassword = await bcrypt.hash(
      setFirstPasswordDto.newPassword,
      10,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
        lastLoginAt: new Date(),
      },
    });

    // Envoyer l'email de confirmation (fire-and-forget)
    this.mailService
      .sendPasswordChangedConfirmation(updatedUser)
      .catch(() => {});

    // Générer le token d'accès
    const accessToken = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    const {
      password,
      otpCode,
      otpExpiry,
      resetToken,
      resetTokenExpiry,
      ...userWithoutSensitive
    } = updatedUser;

    return {
      user: userWithoutSensitive,
      access_token: accessToken,
      isFirstLogin: false,
    };
  }
}
