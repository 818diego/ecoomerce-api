import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { DataSource, Not, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { slugify } from '../common/utils/slugify';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto, ProductStatusFilter } from './dto/find-products-query.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementType } from './enums/stock-movement-type.enum';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(StockMovement)
    private readonly stockMovementsRepository: Repository<StockMovement>,
    private readonly dataSource: DataSource,
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

  async findAllPublic(query: PaginationQueryDto, categoryId?: number) {
    const { limit, skip, page } = query;
    const [data, total] = await this.productsRepository.findAndCount({
      where: {
        active: true,
        category: { active: true },
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      relations: { category: true },
      order: { name: 'ASC' },
      take: limit,
      skip: skip,
    });

    return {
      data: data.map((product) => instanceToPlain(product)),
      meta: {
        total,
        page: page ?? 1,
        lastPage: Math.ceil(total / (limit ?? 10)),
        limit: limit ?? 10,
      },
    };
  }

  async findAll(query: FindProductsQueryDto) {
    const { status, categoryId, search, limit, skip, page } = query;
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

    qb.take(limit).skip(skip);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((product) => instanceToPlain(product)),
      meta: {
        total,
        page: page ?? 1,
        lastPage: Math.ceil(total / (limit ?? 10)),
        limit: limit ?? 10,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.findById(id);
    if (!product || !product.active || !product.category?.active) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async create(data: CreateProductDto, userId: number) {
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

    const initialStock = data.stock ?? 0;

    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        name: data.name,
        slug,
        description: data.description ?? null,
        price: data.price,
        sku,
        imageUrl: data.imageUrl ?? null,
        active: data.active ?? true,
        stock: initialStock,
        category,
      });

      const saved = await manager.save(Product, product);

      if (initialStock > 0) {
        const movement = manager.create(StockMovement, {
          productId: saved.id,
          userId,
          type: StockMovementType.Inicial,
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          observations: 'Stock inicial al crear producto',
        });
        await manager.save(StockMovement, movement);
      }

      return manager.findOne(Product, {
        where: { id: saved.id },
        relations: { category: true },
      });
    });
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
      product.category = category;
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

  async findMovementsByProduct(id: number) {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const movements = await this.stockMovementsRepository.find({
      where: { productId: id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return movements.map((movement) => this.toSafeMovement(movement));
  }

  async registerStockMovement(
    id: number,
    data: StockMovementDto,
    userId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id },
        relations: { category: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      const previousStock = product.stock;
      let newStock: number;
      let movementQuantity: number;

      switch (data.type) {
        case StockMovementType.Entrada:
          newStock = previousStock + data.quantity!;
          movementQuantity = data.quantity!;
          break;

        case StockMovementType.Salida:
          if (previousStock < data.quantity!) {
            throw new BadRequestException(
              'Stock insuficiente para realizar la salida',
            );
          }
          newStock = previousStock - data.quantity!;
          movementQuantity = data.quantity!;
          break;

        case StockMovementType.Ajuste:
          newStock = data.newStock!;
          movementQuantity = Math.abs(newStock - previousStock);
          break;

        default:
          throw new BadRequestException('Tipo de movimiento no válido');
      }

      product.stock = newStock;
      await manager.save(Product, product);

      const movement = manager.create(StockMovement, {
        productId: product.id,
        userId,
        type: data.type,
        quantity: movementQuantity,
        previousStock,
        newStock,
        observations: data.observations?.trim() || null,
      });
      const savedMovement = await manager.save(StockMovement, movement);

      const movementWithUser = await manager.findOne(StockMovement, {
        where: { id: savedMovement.id },
        relations: { user: true },
      });

      const updatedProduct = await manager.findOne(Product, {
        where: { id },
        relations: { category: true },
      });

      return {
        product: instanceToPlain(updatedProduct),
        movement: this.toSafeMovement(movementWithUser!),
      };
    });
  }

  async remove(id: number) {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    const removed = instanceToPlain(product);
    await this.productsRepository.remove(product);
    return removed;
  }

  private toSafeMovement(movement: StockMovement) {
    const { user, ...movementData } = movement;
    return {
      ...movementData,
      user: user
        ? { id: user.id, name: user.name, email: user.email }
        : null,
    };
  }
}
