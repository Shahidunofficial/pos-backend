import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductController } from '../Controller/ProductController';
import { NewSaleController } from '../Controller/NewSaleController';
import { SalesReportController } from '../Controller/SalesReportController';
import { CategoryController } from '../Controller/CategoryController';
import { Product, ProductSchema } from '../models/ProductSchema';
import { Sale, SaleSchema } from '../models/SaleSchema';
import { Category, CategorySchema } from '../models/CategorySchema';
import { ProductService } from '../service/ProductService';
import { SaleService } from '../service/SaleService';
import { SalesReportService } from '../models/SalesReportModel';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [AppController, ProductController, NewSaleController, SalesReportController, CategoryController],
  providers: [AppService, ProductService, SaleService, SalesReportService],
})
export class AppModule {}
