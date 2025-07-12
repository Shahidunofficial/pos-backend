import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from './SaleSchema';
import { Product, ProductDocument } from './ProductSchema';

export interface SalesOverview {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalProducts: number;
}

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  sales: SaleDocument[];
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  dailyStats: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export interface ProductSalesReport {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
}

@Injectable()
export class SalesReportService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getSalesOverview(): Promise<SalesOverview> {
    const [sales, products] = await Promise.all([
      this.saleModel.find().exec(),
      this.productModel.find().exec(),
    ]);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      totalSales: sales.length,
      totalRevenue,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      totalProducts: products.length,
    };
  }

  async getDailySalesReport(date: string): Promise<DailySalesReport> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const sales = await this.saleModel
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .populate('items.productId')
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      date,
      totalSales: sales.length,
      totalRevenue,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      sales,
    };
  }

  async getMonthlySalesReport(month: number, year: number): Promise<MonthlySalesReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = await this.saleModel
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    // Group sales by date
    const dailyStats = new Map<string, { sales: number; revenue: number }>();
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyStats.set(dateStr, { sales: 0, revenue: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    sales.forEach((sale) => {
      const dateStr = (sale as any).createdAt.toISOString().split('T')[0];
      const stats = dailyStats.get(dateStr) || { sales: 0, revenue: 0 };
      stats.sales++;
      stats.revenue += sale.total;
      dailyStats.set(dateStr, stats);
    });

    return {
      month,
      year,
      totalSales: sales.length,
      totalRevenue,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      dailyStats: Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      })),
    };
  }

  async getProductSalesReport(): Promise<ProductSalesReport[]> {
    const sales = await this.saleModel
      .find()
      .populate('items.productId')
      .exec();

    const productStats = new Map<string, ProductSalesReport>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.productId as any;
        if (!product) return;

        const productId = product._id.toString();
        const stats = productStats.get(productId) || {
          productId,
          name: product.name,
          totalQuantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
        };

        stats.totalQuantitySold += item.quantity;
        stats.totalRevenue += item.price * item.quantity;
        stats.averagePrice = stats.totalRevenue / stats.totalQuantitySold;

        productStats.set(productId, stats);
      });
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<SaleDocument[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.saleModel
      .find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
      })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
