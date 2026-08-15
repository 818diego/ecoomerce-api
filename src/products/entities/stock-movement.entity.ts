import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StockMovementType } from '../enums/stock-movement-type.enum';
import { Product } from './product.entity';

@Entity({ name: 'stock_movements' })
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @Column({
    type: 'enum',
    enum: StockMovementType,
  })
  type: StockMovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'previous_stock', type: 'int' })
  previousStock: number;

  @Column({ name: 'new_stock', type: 'int' })
  newStock: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
