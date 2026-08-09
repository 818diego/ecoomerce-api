import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { UserStatusFilter } from './dto/find-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from './enums/role.enum';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  nombre: string;
  telefono?: string;
  correo: string;
  contrasena: string;
  rol: Role;
  activo?: boolean;
}

export interface UpdateUserInput {
  nombre?: string;
  telefono?: string;
  correo?: string;
  contrasena?: string;
  rol?: Role;
  activo?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(correo: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { correo } });
  }

  findByCorreoOrTelefono(
    correo: string,
    telefono?: string,
  ): Promise<User | null> {
    const where = telefono ? [{ correo }, { telefono }] : [{ correo }];
    return this.usersRepository.findOne({ where });
  }

  findConflictExcludingId(
    correo: string,
    telefono: string | undefined,
    excludeId: number,
  ): Promise<User | null> {
    const where = telefono
      ? [
          { correo, id: Not(excludeId) },
          { telefono, id: Not(excludeId) },
        ]
      : [{ correo, id: Not(excludeId) }];
    return this.usersRepository.findOne({ where });
  }

  async findAll(status?: UserStatusFilter) {
    let activo: boolean | undefined;
    if (status !== undefined) {
      if (status === UserStatusFilter.Activo) activo = true;
      else if (status === UserStatusFilter.Inactivo) activo = false;
      else {
        throw new BadRequestException(
          'El parámetro status debe ser activo o inactivo',
        );
      }
    }
    const users = await this.usersRepository.find({
      where: activo !== undefined ? { activo } : {},
      order: { id: 'ASC' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  async createUser(data: CreateUserDto) {
    return this.create({
      ...data,
      rol: Role.Administrador,
      activo: data.activo ?? true,
    });
  }

  async create(data: CreateUserInput) {
    const exists = await this.findByCorreoOrTelefono(
      data.correo,
      data.telefono,
    );
    if (exists) {
      throw new ConflictException(
        data.telefono
          ? 'Ya existe un usuario con ese correo o teléfono'
          : 'Ya existe un usuario con ese correo',
      );
    }
    const hashedPassword = await bcrypt.hash(data.contrasena, 10);
    const user = this.usersRepository.create({
      ...data,
      contrasena: hashedPassword,
      activo: data.activo ?? true,
    });
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async update(id: number, data: UpdateUserInput) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const correo = data.correo ?? user.correo;
    const telefono =
      data.telefono !== undefined ? data.telefono : (user.telefono ?? undefined);

    if (data.correo || data.telefono !== undefined) {
      const conflict = await this.findConflictExcludingId(
        correo,
        telefono,
        id,
      );
      if (conflict) {
        throw new ConflictException(
          telefono
            ? 'Ya existe un usuario con ese correo o teléfono'
            : 'Ya existe un usuario con ese correo',
        );
      }
    }

    if (data.nombre !== undefined) user.nombre = data.nombre;
    if (data.correo !== undefined) user.correo = data.correo;
    if (data.telefono !== undefined) user.telefono = data.telefono || null;
    if (data.rol !== undefined) user.rol = data.rol;
    if (data.activo !== undefined) user.activo = data.activo;
    if (data.contrasena) {
      user.contrasena = await bcrypt.hash(data.contrasena, 10);
    }

    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async remove(id: number) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const safeUser = this.toSafeUser(user);
    await this.usersRepository.remove(user);
    return safeUser;
  }

  private toSafeUser(user: User) {
    const { contrasena: _password, ...safeUser } = user;
    return safeUser;
  }
}