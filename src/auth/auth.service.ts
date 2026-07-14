import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterAuthDto) {
    const exists = await this.usersService.findByCorreoOrTelefono(
      registerDto.correo,
      registerDto.telefono,
    );
    if (exists) {
      throw new ConflictException(
        'Ya existe un usuario con ese correo o teléfono',
      );
    }
    const user = await this.usersService.create({
      nombre: registerDto.nombre,
      telefono: registerDto.telefono,
      correo: registerDto.correo,
      contrasena: registerDto.contrasena,
      rol: registerDto.rol ?? Role.Usuario,
    });
    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginAuthDto) {
    const user = await this.usersService.findByEmail(loginDto.correo);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isMatch = await bcrypt.compare(loginDto.contrasena, user.contrasena);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
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