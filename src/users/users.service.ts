import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from './enums/role.enum';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  nombre: string;
  telefono: string;
  correo: string;
  contrasena: string;
  rol: Role;
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
    telefono: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ correo }, { telefono }],
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.contrasena, 10);
    const user = this.usersRepository.create({
      ...data,
      contrasena: hashedPassword,
    });
    return this.usersRepository.save(user);
  }
}