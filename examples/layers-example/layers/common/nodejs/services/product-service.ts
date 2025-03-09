import { Product } from '../models/product';
import { DbService } from './db-service';

/**
 * Mock product data for demonstration purposes
 * In a real application, this would be stored in a database
 */
const mockProducts: Product[] = [
    {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Smartphone',
        description: 'Latest model smartphone with advanced features',
        price: 799.99,
        stock: 50
    },
    {
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Laptop',
        description: 'High-performance laptop for professionals',
        price: 1299.99,
        stock: 25
    },
    {
        id: '323e4567-e89b-12d3-a456-426614174002',
        name: 'Wireless Headphones',
        description: 'Noise-cancelling wireless headphones',
        price: 199.99,
        stock: 100
    }
];

/**
 * Product service for handling product-related operations
 * This implementation provides both mock data and database functionality
 */
export class ProductService {
    private dbService: DbService;
    private useMockData: boolean;

    constructor(dbService?: DbService) {
        this.dbService = dbService || new DbService();
        // Use mock data if DB_SECRET_ID is not set
        this.useMockData = !process.env.DB_SECRET_ID;
    }

    /**
     * Get all products
     */
    async getAllProducts(): Promise<Product[]> {
        if (this.useMockData) {
            // Return mock data
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(mockProducts);
                }, 100);
            });
        }

        try {
            // Get products from database
            return await this.dbService.executeQuery<Product>(
                'SELECT * FROM products LIMIT 100'
            );
        } catch (error) {
            console.error('Error fetching products from database:', error);
            // Fallback to mock data if database query fails
            return mockProducts;
        }
    }
    
    /**
     * Get a product by ID
     */
    async getProductById(id: string): Promise<Product | null> {
        if (this.useMockData) {
            // Return mock data
            return new Promise((resolve) => {
                setTimeout(() => {
                    const product = mockProducts.find(p => p.id === id);
                    resolve(product || null);
                }, 100);
            });
        }

        try {
            // Get product from database
            const products = await this.dbService.executeQuery<Product>(
                'SELECT * FROM products WHERE id = $1',
                [id]
            );
            
            return products.length > 0 ? products[0] : null;
        } catch (error) {
            console.error('Error fetching product from database:', error);
            // Fallback to mock data if database query fails
            const product = mockProducts.find(p => p.id === id);
            return product || null;
        }
    }
    
    /**
     * Create a new product
     */
    async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
        // Generate a UUID for the new product
        const id = require('crypto').randomUUID();
        const newProduct: Product = { ...product, id };

        if (this.useMockData) {
            // Add to mock data
            mockProducts.push(newProduct);
            return newProduct;
        }

        try {
            // Insert into database
            await this.dbService.executeQuery(
                'INSERT INTO products (id, name, description, price, stock) VALUES ($1, $2, $3, $4, $5)',
                [id, product.name, product.description, product.price, product.stock]
            );
            
            return newProduct;
        } catch (error) {
            console.error('Error creating product in database:', error);
            // Add to mock data as fallback
            mockProducts.push(newProduct);
            return newProduct;
        }
    }
} 