import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

interface Variant {
  id: string;
  color?: string;
  ram?: string;
  storage?: string;
  purchasedPrice: number;
  sellingPrice: number;
  stock: number;
}

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  basePrice: number;

  @Prop({ required: true })
  purchasedPrice: number;

  @Prop({ required: true })
  sellingPrice: number;

  @Prop({ required: true })
  mainCategory: string;

  @Prop()
  subCategory?: string;

  @Prop()
  subSubCategory?: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], required: true, validate: [(val: string[]) => val.length <= 3, 'Maximum 3 images allowed'] })
  images: string[];

  @Prop({ type: Object, default: {} })
  specifications: Record<string, string>;

  @Prop({ type: Object, default: {} })
  availableOptions: {
    color?: string[];
    ram?: string[];
    storage?: string[];
  };

  @Prop({
    type: [{
      id: String,
      color: String,
      ram: String,
      storage: String,
      purchasedPrice: Number,
      sellingPrice: Number,
      stock: Number
    }],
    default: []
  })
  variants: Variant[];
}

export const ProductSchema = SchemaFactory.createForClass(Product); 