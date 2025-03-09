/**
 * Common Layer for AWS Lambda
 * 
 * This layer contains shared code that can be used across multiple Lambda functions.
 * When deployed, this code will be available at /opt/nodejs/ in the Lambda runtime.
 */

// Export models
export * from './models/product';

// Export services
export * from './services/product-service';
export * from './services/db-service';

// Create singleton instances of services
import { ProductService } from './services/product-service';
import { DbService } from './services/db-service';

export const dbService = new DbService();
export const productService = new ProductService(dbService); 