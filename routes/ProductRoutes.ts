import { Module } from '@nestjs/common';
import { ProductController } from '../Controller/ProductController';

@Module({
  controllers: [ProductController],
  providers: [],
  exports: [],
})
export class ProductModule {}
