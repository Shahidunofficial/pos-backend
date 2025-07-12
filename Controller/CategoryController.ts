import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { Category, CategoryDocument } from '../models/CategorySchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface CreateCategoryDto {
  name: string;
  parentId?: string;
  level: number;
}

@Controller('categories')
export class CategoryController {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}

  @Get()
  async getAllCategories(): Promise<any[]> {
    try {
      // Only fetch main categories (level 1), subcategories will be populated automatically
      const categories = await this.categoryModel
        .find({ level: 1 })
        .populate({
          path: 'subCategories',
          populate: {
            path: 'subCategories'
          }
        })
        .lean();
      
      // Transform _id to id for frontend compatibility
      const transformCategory = (cat: any): any => {
        if (!cat) return null;
        return {
          ...cat,
          id: cat._id.toString(),
          subCategories: cat.subCategories ? cat.subCategories.map(transformCategory) : []
        };
      };
      
      return categories.map(transformCategory);
    } catch (error) {
      throw new HttpException('Failed to fetch categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<any> {
    try {
      if (!createCategoryDto.name) {
        throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
      }

      if (createCategoryDto.level < 1 || createCategoryDto.level > 3) {
        throw new HttpException('Level must be between 1 and 3', HttpStatus.BAD_REQUEST);
      }

      // For level 1 (main categories), parentId should not be provided
      if (createCategoryDto.level === 1 && createCategoryDto.parentId) {
        throw new HttpException('Main categories cannot have a parent', HttpStatus.BAD_REQUEST);
      }

      // For levels 2 and 3, validate parent category
      if (createCategoryDto.level > 1) {
        if (!createCategoryDto.parentId) {
          throw new HttpException('Parent category is required for subcategories', HttpStatus.BAD_REQUEST);
        }

        const parentCategory = await this.categoryModel.findById(createCategoryDto.parentId);
        if (!parentCategory) {
          throw new HttpException('Parent category not found', HttpStatus.NOT_FOUND);
        }

        // Validate parent-child level relationship
        if (parentCategory.level !== createCategoryDto.level - 1) {
          throw new HttpException('Invalid parent-child level relationship', HttpStatus.BAD_REQUEST);
        }
      }

      const category = new this.categoryModel(createCategoryDto);
      const savedCategory = await category.save();
      
      // Return with id field for frontend compatibility
      const categoryObj = savedCategory.toObject();
      return {
        ...categoryObj,
        id: (savedCategory._id as any).toString()
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create category', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 