import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { UserStatusFilter } from './dto/find-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from './enums/role.enum';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  name: string;
  phone?: string;
  email: string;
  password: string;
  role: Role;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: Role;
  active?: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  email?: string;
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

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailOrPhone(email: string, phone?: string): Promise<User | null> {
    const where = phone ? [{ email }, { phone }] : [{ email }];
    return this.usersRepository.findOne({ where });
  }

  findConflictExcludingId(
    email: string,
    phone: string | undefined,
    excludeId: number,
  ): Promise<User | null> {
    const where = phone
      ? [
          { email, id: Not(excludeId) },
          { phone, id: Not(excludeId) },
        ]
      : [{ email, id: Not(excludeId) }];
    return this.usersRepository.findOne({ where });
  }

  async findOne(id: number) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toSafeUser(user);
  }

  async findAll(status?: UserStatusFilter) {
    let active: boolean | undefined;
    if (status !== undefined) {
      if (status === UserStatusFilter.Active) active = true;
      else if (status === UserStatusFilter.Inactive) active = false;
      else {
        throw new BadRequestException(
          'El parámetro status debe ser active o inactive',
        );
      }
    }
    const users = await this.usersRepository.find({
      where: active !== undefined ? { active } : {},
      order: { id: 'ASC' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  async createUser(data: CreateUserDto) {
    return this.create({
      ...data,
      role: Role.Administrador,
      active: data.active ?? true,
    });
  }

  async create(data: CreateUserInput) {
    const exists = await this.findByEmailOrPhone(data.email, data.phone);
    if (exists) {
      throw new ConflictException(
        data.phone
          ? 'Ya existe un usuario con ese correo o teléfono'
          : 'Ya existe un usuario con ese correo',
      );
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.usersRepository.create({
      ...data,
      password: hashedPassword,
      active: data.active ?? true,
    });
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  async updateProfile(id: number, data: UpdateProfileInput) {
    return this.update(id, data);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }
    return this.update(id, { password: newPassword });
  }

  async update(id: number, data: UpdateUserInput) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const email = data.email ?? user.email;
    const phone =
      data.phone !== undefined ? data.phone : (user.phone ?? undefined);

    if (data.email || data.phone !== undefined) {
      const conflict = await this.findConflictExcludingId(email, phone, id);
      if (conflict) {
        throw new ConflictException(
          phone
            ? 'Ya existe un usuario con ese correo o teléfono'
            : 'Ya existe un usuario con ese correo',
        );
      }
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.phone !== undefined) user.phone = data.phone || null;
    if (data.role !== undefined) user.role = data.role;
    if (data.active !== undefined) user.active = data.active;
    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
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
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
