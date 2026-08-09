import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginAuthDto) {
    const user = await this.usersService.findByEmail(loginDto.correo);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isMatch = await bcrypt.compare(loginDto.contrasena, user.contrasena);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      correo: user.correo,
      rol: user.rol,
    };
    const { contrasena: _password, ...safeUser } = user;
    return {
      user: safeUser,
      access_token: this.jwtService.sign(payload),
    };
  }
}