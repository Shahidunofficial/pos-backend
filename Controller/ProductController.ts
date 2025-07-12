import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ProductService, CreateProductDto, UpdateProductDto } from '../service/ProductService';
import { Product, ProductDocument } from '../models/ProductSchema';
import { Category, CategoryDocument } from '../models/CategorySchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}
  
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto): Promise<ProductDocument> {
    try {
      // Validate required fields
      if (!createProductDto.name || !createProductDto.brand || !createProductDto.mainCategory || !createProductDto.description) {
        throw new HttpException('Name, brand, main category, and description are required', HttpStatus.BAD_REQUEST);
      }

      if (createProductDto.basePrice <= 0 || createProductDto.purchasedPrice <= 0 || createProductDto.sellingPrice <= 0) {
        throw new HttpException('All prices must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      if (!createProductDto.images || createProductDto.images.length === 0) {
        throw new HttpException('At least one image is required', HttpStatus.BAD_REQUEST);
      }

      if (createProductDto.images.length > 3) {
        throw new HttpException('Maximum 3 images allowed', HttpStatus.BAD_REQUEST);
      }

      // Validate variants
      if (!createProductDto.variants || createProductDto.variants.length === 0) {
        // Create default variant if none provided
        createProductDto.variants = [{
          id: 'default',
          purchasedPrice: createProductDto.purchasedPrice,
          sellingPrice: createProductDto.sellingPrice,
          stock: 0
        }];
      } else {
        // Validate each variant
        for (const variant of createProductDto.variants) {
          if (variant.purchasedPrice <= 0 || variant.sellingPrice <= 0) {
            throw new HttpException(`Variant ${variant.id} prices must be greater than 0`, HttpStatus.BAD_REQUEST);
          }
          if (variant.stock < 0) {
            throw new HttpException(`Variant ${variant.id} stock cannot be negative`, HttpStatus.BAD_REQUEST);
          }
        }
      }

      // Validate that the main category exists
      const mainCategory = await this.categoryModel.findById(createProductDto.mainCategory);
      if (!mainCategory) {
        throw new HttpException('Main category not found', HttpStatus.BAD_REQUEST);
      }

      // If subcategory is provided, validate it exists and belongs to the main category
      if (createProductDto.subCategory) {
        const subCategory = await this.categoryModel.findById(createProductDto.subCategory);
        if (!subCategory || subCategory.parentId?.toString() !== createProductDto.mainCategory) {
          throw new HttpException('Invalid sub-category', HttpStatus.BAD_REQUEST);
        }

        // If sub-subcategory is provided, validate it exists and belongs to the subcategory
        if (createProductDto.subSubCategory) {
          const subSubCategory = await this.categoryModel.findById(createProductDto.subSubCategory);
          if (!subSubCategory || subSubCategory.parentId?.toString() !== createProductDto.subCategory) {
            throw new HttpException('Invalid sub-sub-category', HttpStatus.BAD_REQUEST);
          }
        }
      }

      const product = await this.productService.create(createProductDto);
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getAllProducts(): Promise<ProductDocument[]> {
    try {
      return await this.productService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<ProductDocument> {
    try {
      const product = await this.productService.findById(id);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<ProductDocument> {
    try {
      if (updateProductDto.basePrice !== undefined && updateProductDto.basePrice <= 0) {
        throw new HttpException('Base price must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      // If updating main category, validate it exists
      if (updateProductDto.mainCategory) {
        const mainCategory = await this.categoryModel.findById(updateProductDto.mainCategory);
        if (!mainCategory) {
          throw new HttpException('Main category not found', HttpStatus.BAD_REQUEST);
        }
      }

      // If updating sub-category, validate it exists and belongs to the main category
      if (updateProductDto.subCategory) {
        const product = await this.productService.findById(id);
        const mainCategoryId = updateProductDto.mainCategory || product?.mainCategory;
        
        const subCategory = await this.categoryModel.findById(updateProductDto.subCategory);
        if (!subCategory || subCategory.parentId?.toString() !== mainCategoryId) {
          throw new HttpException('Invalid sub-category', HttpStatus.BAD_REQUEST);
        }
      }

      const product = await this.productService.update(id, updateProductDto);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    try {
      const deleted = await this.productService.delete(id);
      if (!deleted) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to delete product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() body: { stockChange: number }
  ): Promise<ProductDocument> {
    try {
      const product = await this.productService.updateStock(id, body.stockChange);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message === 'Insufficient stock') {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to update stock', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
