import { povery, controller, api, pathParam } from 'povery';
import { PoveryError } from 'povery/dist/povery_error';

// Import from the Lambda Layer
// In AWS Lambda, the layer will be available at /opt/nodejs/
// For local development, we've configured the path mapping in tsconfig.json
import { productService, GetProductDto } from '/opt/nodejs';

/**
 * This example demonstrates how to use Povery with AWS Lambda Layers
 * for sharing code across multiple Lambda functions.
 * 
 * Key features:
 * 1. Shared models and services in a Lambda Layer
 * 2. Path parameter validation
 * 3. Error handling
 */

@controller
class ProductController {
    /**
     * Get all products
     */
    @api('GET', '/products')
    async getProducts() {
        try {
            const products = await productService.getAllProducts();
            return { products };
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new PoveryError('Failed to fetch products', 500);
        }
    }
    
    /**
     * Get a product by ID
     * Uses path parameter validation with @pathParam decorator
     */
    @api('GET', '/products/:id')
    async getProductById(
        event: any,
        context: any,
        @pathParam({ name: 'id', validators: [] }) id: string
    ) {
        try {
            // Validate the ID
            const productDto = new GetProductDto();
            productDto.id = id;
            
            const product = await productService.getProductById(id);
            
            if (!product) {
                throw new PoveryError('Product not found', 404);
            }
            
            return { product };
        } catch (error) {
            if (error instanceof PoveryError) {
                throw error;
            }
            console.error('Error fetching product:', error);
            throw new PoveryError('Failed to fetch product', 500);
        }
    }
}

/**
 * Export the Lambda handler
 */
exports.handler = povery.load(ProductController); 