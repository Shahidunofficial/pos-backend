import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ProductService } from '../service/ProductService';
import { SaleService } from '../service/SaleService';
import { ProductDocument } from '../models/ProductSchema';
import { SaleDocument } from '../models/SaleSchema';
import { Types } from 'mongoose';

export interface SaleItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  createdAt: Date;
  customerName?: string;
}

export interface CreateSaleDto {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName?: string;
}

export interface Receipt {
  saleId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName?: string;
  saleDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

@Controller('sales')
export class NewSaleController {
  constructor(
    private readonly productService: ProductService,
    private readonly saleService: SaleService,
  ) {}
  
  @Post()
  async createSale(@Body() createSaleDto: CreateSaleDto): Promise<SaleDocument> {
    try {
      if (!createSaleDto.items || createSaleDto.items.length === 0) {
        throw new HttpException('Sale must contain at least one item', HttpStatus.BAD_REQUEST);
      }

      const saleItems: SaleItem[] = [];
      let total = 0;

      // Process each item in the sale
      for (const item of createSaleDto.items) {
        if (item.quantity <= 0) {
          throw new HttpException('Quantity must be greater than 0', HttpStatus.BAD_REQUEST);
        }

        // Get product details
        const product = await this.productService.findById(item.productId);
        if (!product) {
          throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);
        }

        // If product has variants, use the default variant's price and stock
        // Otherwise use the base price and treat stock as 0
        const defaultVariant = product.variants && product.variants[0];
        const price = defaultVariant ? defaultVariant.sellingPrice : product.basePrice;
        const stock = defaultVariant ? defaultVariant.stock : 0;

        // Check stock availability
        if (stock < item.quantity) {
          throw new HttpException(
            `Insufficient stock for product ${product.name}. Available: ${stock}, Requested: ${item.quantity}`,
            HttpStatus.BAD_REQUEST
          );
        }

        // Create sale item
        const saleItem: SaleItem = {
          productId: new Types.ObjectId(item.productId),
          quantity: item.quantity,
          price: price,
        };

        saleItems.push(saleItem);
        total += saleItem.price * saleItem.quantity;
      }

      // Update stock for all products
      for (const item of createSaleDto.items) {
        await this.productService.updateStock(item.productId, -item.quantity);
      }

      // Create the sale
      const sale = await this.saleService.create({
        items: saleItems,
        total,
        customerName: createSaleDto.customerName,
      });

      return sale;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create sale', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getAllSales(): Promise<SaleDocument[]> {
    try {
      return await this.saleService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch sales', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getSaleById(@Param('id') id: string): Promise<SaleDocument> {
    try {
      const sale = await this.saleService.findById(id);
      if (!sale) {
        throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
      }
      return sale;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch sale', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('products/available')
  async getAvailableProducts(): Promise<ProductDocument[]> {
    try {
      return await this.productService.findAvailableProducts();
    } catch (error) {
      throw new HttpException('Failed to fetch available products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/receipt')
  async generateReceipt(@Param('id') id: string): Promise<Receipt> {
    try {
      const sale = await this.saleService.findById(id);
      if (!sale) {
        throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
      }

      // Get product details for receipt
      const receiptItems: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
      }> = [];
      
      for (const item of sale.items) {
        const product = await this.productService.findById(item.productId.toString());
        receiptItems.push({
          name: product ? product.name : `Product ${item.productId}`,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        });
      }

      const subtotal = sale.total;
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      const receipt: Receipt = {
        saleId: (sale as any)._id.toString(),
        storeName: 'POS Store',
        storeAddress: '123 Business Street, City, State 12345',
        storePhone: '(555) 123-4567',
        customerName: sale.customerName,
        saleDate: (sale as any).createdAt.toLocaleString(),
        items: receiptItems,
        subtotal,
        tax,
        total,
        paymentMethod: 'Cash', // Default payment method
      };

      return receipt;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to generate receipt', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/receipt/print')
  async getPrintReceipt(@Param('id') id: string): Promise<{ receiptText: string }> {
    try {
      const receipt = await this.generateReceipt(id);
      const receiptText = this.formatReceiptFor3Inch(receipt);
      return { receiptText };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to generate print receipt', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private formatReceiptFor3Inch(receipt: Receipt): string {
    const width = 32; // 3-inch (76mm) thermal printer width in characters
    let receiptText = '';

    // Header
    receiptText += this.centerText(receipt.storeName, width) + '\n';
    receiptText += this.centerText(receipt.storeAddress, width) + '\n';
    receiptText += this.centerText(receipt.storePhone, width) + '\n';
    receiptText += '='.repeat(width) + '\n';
    
    // Sale info
    receiptText += `Sale #: ${receipt.saleId}\n`;
    receiptText += `Date: ${receipt.saleDate}\n`;
    if (receipt.customerName) {
      receiptText += `Cust: ${receipt.customerName}\n`;
    }
    receiptText += '-'.repeat(width) + '\n';

    // Items
    receipt.items.forEach(item => {
      const name = this.truncateText(item.name, 16);
      receiptText += name + '\n';
      receiptText += `  ${item.quantity}x ${this.rightAlign(`${item.price.toFixed(2)}`, 8)} `;
      receiptText += this.rightAlign(`${(item.quantity * item.price).toFixed(2)}`, 8) + '\n';
    });

    receiptText += '-'.repeat(width) + '\n';

    // Totals
    receiptText += `Subtotal:${this.rightAlign(receipt.subtotal.toFixed(2), width - 9)}\n`;
    receiptText += `Tax:${this.rightAlign(receipt.tax.toFixed(2), width - 4)}\n`;
    receiptText += `Total:${this.rightAlign(receipt.total.toFixed(2), width - 6)}\n`;
    receiptText += '-'.repeat(width) + '\n';

    // Payment info
    receiptText += `Paid by: ${receipt.paymentMethod}\n`;
    receiptText += '='.repeat(width) + '\n\n';

    // Footer
    receiptText += this.centerText('Thank you for your business!', width) + '\n';
    receiptText += this.centerText('Please come again', width) + '\n\n';

    return receiptText;
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + text;
  }

  private rightAlign(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
