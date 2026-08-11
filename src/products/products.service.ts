import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { slugify } from '../common/utils/slugify';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductStatusFilter } from './dto/find-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findById(id: number): Promise<Product | null> {
    return this.productsRepository.findOne({
      where: { id },
      relations: { category: true },
    });
  }

  findSlugConflict(
    slug: string,
    excludeId?: number,
  ): Promise<Product | null> {
    const where =
      excludeId !== undefined ? { slug, id: Not(excludeId) } : { slug };
    return this.productsRepository.findOne({ where });
  }

  findSkuConflict(
    sku: string,
    excludeId?: number,
  ): Promise<Product | null> {
    const where =
      excludeId !== undefined ? { sku, id: Not(excludeId) } : { sku };
    return this.productsRepository.findOne({ where });
  }

  async findAllPublic(categoryId?: number) {
    return this.productsRepository.find({
      where: {
        active: true,
        category: { active: true },
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async findAll(
    status?: ProductStatusFilter,
    categoryId?: number,
    search?: string,
  ) {
    let active: boolean | undefined;
    if (status !== undefined) {
      if (status === ProductStatusFilter.Active) active = true;
      else if (status === ProductStatusFilter.Inactive) active = false;
      else {
        throw new BadRequestException(
          'El parámetro status debe ser active o inactive',
        );
      }
    }

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.name', 'ASC');

    if (active !== undefined) {
      qb.andWhere('product.active = :active', { active });
    }

    if (categoryId !== undefined) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      qb.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const product = await this.findById(id);
    if (!product || !product.active || !product.category?.active) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async create(data: CreateProductDto) {
    const category = await this.categoriesRepository.findOne({
      where: { id: data.categoryId },
    });
    if (!category || !category.active) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const slug = slugify(data.name);
    if (!slug) {
      throw new BadRequestException(
        'No se pudo generar un slug válido desde el nombre',
      );
    }

    const slugConflict = await this.findSlugConflict(slug);
    if (slugConflict) {
      throw new ConflictException('Ya existe un producto con ese nombre');
    }

    const sku = data.sku?.trim() || null;
    if (sku) {
      const skuConflict = await this.findSkuConflict(sku);
      if (skuConflict) {
        throw new ConflictException('Ya existe un producto con ese SKU');
      }
    }

    const product = this.productsRepository.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      price: data.price,
      sku,
      imageUrl: data.imageUrl ?? null,
      active: data.active ?? true,
      categoryId: data.categoryId,
    });

    const saved = await this.productsRepository.save(product);
    return this.findById(saved.id);
  }

  async update(id: number, data: UpdateProductDto) {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (data.categoryId !== undefined) {
      const category = await this.categoriesRepository.findOne({
        where: { id: data.categoryId },
      });
      if (!category || !category.active) {
        throw new NotFoundException('Categoría no encontrada');
      }
      product.categoryId = data.categoryId;
    }

    if (data.name !== undefined && data.name !== product.name) {
      const slug = slugify(data.name);
      if (!slug) {
        throw new BadRequestException(
          'No se pudo generar un slug válido desde el nombre',
        );
      }
      const slugConflict = await this.findSlugConflict(slug, id);
      if (slugConflict) {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }
      product.name = data.name;
      product.slug = slug;
    }

    if (data.price !== undefined) {
      product.price = data.price;
    }

    if (data.description !== undefined) {
      product.description = data.description || null;
    }

    if (data.sku !== undefined) {
      if (data.sku) {
        const skuConflict = await this.findSkuConflict(data.sku, id);
        if (skuConflict) {
          throw new ConflictException('Ya existe un producto con ese SKU');
        }
      }
      product.sku = data.sku || null;
    }

    if (data.imageUrl !== undefined) {
      product.imageUrl = data.imageUrl || null;
    }

    if (data.active !== undefined) {
      product.active = data.active;
    }

    await this.productsRepository.save(product);
    return this.findById(id);
  }

  async remove(id: number) {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    const removed = { ...product };
    await this.productsRepository.remove(product);
    return removed;
  }
}
