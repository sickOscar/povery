import { IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';

/**
 * Product model representing a product in the database
 */
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
}

/**
 * Data Transfer Object for retrieving a product
 * Used for parameter validation
 */
export class GetProductDto {
    @IsUUID('4')
    id: string;
    
    static fromObject(obj: any): GetProductDto {
        const dto = new GetProductDto();
        Object.assign(dto, obj);
        return dto;
    }
}

/**
 * Data Transfer Object for creating a new product
 * Includes validation rules using class-validator
 */
export class CreateProductDto {
    @IsString()
    name: string;
    
    @IsString()
    description: string;
    
    @IsNumber()
    @Min(0.01)
    price: number;
    
    @IsNumber()
    @Min(0)
    @Max(10000)
    stock: number;
    
    static fromObject(obj: any): CreateProductDto {
        const dto = new CreateProductDto();
        Object.assign(dto, obj);
        return dto;
    }
} 