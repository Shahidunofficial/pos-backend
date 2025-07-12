export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductModel {
  private static products: Product[] = [];
  private static idCounter = 1;

  static async create(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const product: Product = {
      id: this.idCounter.toString(),
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.products.push(product);
    this.idCounter++;
    return product;
  }

  static async findAll(): Promise<Product[]> {
    return this.products;
  }

  static async findById(id: string): Promise<Product | null> {
    return this.products.find(product => product.id === id) || null;
  }

  static async update(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) {
      return null;
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      ...productData,
      updatedAt: new Date(),
    };

    return this.products[productIndex];
  }

  static async delete(id: string): Promise<boolean> {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) {
      return false;
    }

    this.products.splice(productIndex, 1);
    return true;
  }

  static async updateStock(id: string, stockChange: number): Promise<Product | null> {
    const product = await this.findById(id);
    if (!product) {
      return null;
    }

    const newStock = product.stock + stockChange;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    return this.update(id, { stock: newStock });
  }
}
