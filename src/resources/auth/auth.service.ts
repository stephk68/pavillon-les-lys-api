import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/services/prisma.service';
import { UserService } from '../user/user.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Créer l'utilisateur
    const user = await this.userService.create(registerDto);

    // Générer le token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      user,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    // Trouver l'utilisateur par email
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await this.userService.validatePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Générer le token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: token,
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
          'Si cet email existe, un lien de réinitialisation a été envoyé',
      };
    }

    // Générer un token de réinitialisation
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    // Stocker le token en base (optionnel, dépend de votre stratégie)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Vous pouvez ajouter un champ resetToken dans votre schéma Prisma
        // resetToken,
        // resetTokenExpiry: new Date(Date.now() + 3600000) // 1 heure
      },
    });

    // TODO: Envoyer l'email avec le token de réinitialisation
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      // En développement seulement
      resetToken:
        process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      // Vérifier le token
      const payload = this.jwtService.verify(resetPasswordDto.token);

      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Token de réinitialisation invalide');
      }

      // Mettre à jour le mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        resetPasswordDto.newPassword,
        saltRounds,
      );

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: {
          password: hashedPassword,
          // resetToken: null,
          // resetTokenExpiry: null,
        },
      });

      return { message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré',
      );
    }
  }

  async validateUser(userId: string) {
    return this.userService.findOne(userId);
  }

  async logout(userId: string) {
    // Si vous utilisez une blacklist de tokens, ajoutez-le ici
    // await this.addTokenToBlacklist(token);

    return { message: 'Déconnexion réussie' };
  }

  async getProfile(userId: string) {
    return this.userService.findOne(userId);
  }
}
