import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema()
export class SaleItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;
}

const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

@Schema({
  timestamps: true,
})
export class Sale {
  @Prop({ type: [SaleItemSchema], required: true })
  items: SaleItem[];

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop()
  customerName?: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale); 