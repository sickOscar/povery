import { IsEmail, IsString, Length, IsOptional, IsUUID } from 'class-validator';

/**
 * User model representing a user in the database
 */
export interface User {
    id: string;
    name: string;
    email: string;
    created_at: Date;
    updated_at: Date;
}

/**
 * Data Transfer Object for creating a new user
 * Includes validation rules using class-validator
 */
export class CreateUserDto {
    @IsString()
    @Length(2, 50)
    name: string;
    
    @IsEmail()
    email: string;
    
    /**
     * Static method to create a DTO from a plain object
     */
    static fromObject(obj: any): CreateUserDto {
        const dto = new CreateUserDto();
        Object.assign(dto, obj);
        return dto;
    }
}

/**
 * Data Transfer Object for retrieving a user
 * Used for parameter validation
 */
export class GetUserDto {
    @IsUUID('4')
    id: string;
    
    static fromObject(obj: any): GetUserDto {
        const dto = new GetUserDto();
        Object.assign(dto, obj);
        return dto;
    }
} 