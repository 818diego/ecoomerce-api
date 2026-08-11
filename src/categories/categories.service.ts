import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { slugify } from '../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryStatusFilter } from './dto/find-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findById(id: number): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  findSlugConflict(
    slug: string,
    excludeId?: number,
  ): Promise<Category | null> {
    const where =
      excludeId !== undefined ? { slug, id: Not(excludeId) } : { slug };
    return this.categoriesRepository.findOne({ where });
  }

  async findAllPublic() {
    return this.categoriesRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  async findAll(status?: CategoryStatusFilter) {
    let active: boolean | undefined;
    if (status !== undefined) {
      if (status === CategoryStatusFilter.Active) active = true;
      else if (status === CategoryStatusFilter.Inactive) active = false;
      else {
        throw new BadRequestException(
          'El parámetro status debe ser active o inactive',
        );
      }
    }
    return this.categoriesRepository.find({
      where: active !== undefined ? { active } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const category = await this.findById(id);
    if (!category || !category.active) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async create(data: CreateCategoryDto) {
    const slug = slugify(data.name);
    if (!slug) {
      throw new BadRequestException(
        'No se pudo generar un slug válido desde el nombre',
      );
    }
    const conflict = await this.findSlugConflict(slug);
    if (conflict) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
    const category = this.categoriesRepository.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      active: data.active ?? true,
    });
    return this.categoriesRepository.save(category);
  }

  async update(id: number, data: UpdateCategoryDto) {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    let slug = category.slug;
    if (data.name !== undefined && data.name !== category.name) {
      slug = slugify(data.name);
      if (!slug) {
        throw new BadRequestException(
          'No se pudo generar un slug válido desde el nombre',
        );
      }
      const conflict = await this.findSlugConflict(slug, id);
      if (conflict) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      category.name = data.name;
      category.slug = slug;
    }

    if (data.description !== undefined) {
      category.description = data.description || null;
    }
    if (data.active !== undefined) category.active = data.active;

    return this.categoriesRepository.save(category);
  }

  async remove(id: number) {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    const productsCount = await this.productsRepository.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      throw new ConflictException('Existen productos en esta categoría');
    }
    const removed = { ...category };
    await this.categoriesRepository.remove(category);
    return removed;
  }
}
