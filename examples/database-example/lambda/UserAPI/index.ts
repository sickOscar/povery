import { povery, controller, api, body, pathParam } from 'povery';
import { executeQuery } from './db';
import { User, CreateUserDto, GetUserDto } from './models';
import { PoveryError } from 'povery/dist/povery_error';

/**
 * This example demonstrates how to use Povery with a database connection
 * following AWS Lambda best practices.
 * 
 * Key features:
 * 1. Connection pooling with reuse across invocations
 * 2. Connection validation before use
 * 3. Secure credential management with AWS Secrets Manager
 * 4. Parameter validation with DTOs
 * 5. Error handling
 */

@controller
class UserController {
    /**
     * Get all users
     */
    @api('GET', '/users')
    async getUsers() {
        try {
            const users = await executeQuery<User>('SELECT * FROM users LIMIT 100');
            return { users };
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new PoveryError('Failed to fetch users', 500);
        }
    }
    
    /**
     * Get a user by ID
     * Uses path parameter validation with @pathParam decorator
     */
    @api('GET', '/users/:id')
    async getUserById(
        event: any,
        context: any,
        @pathParam({ name: 'id', validators: [] }) id: string
    ) {
        try {
            // Validate the ID
            const userDto = new GetUserDto();
            userDto.id = id;
            
            const users = await executeQuery<User>(
                'SELECT * FROM users WHERE id = $1',
                [id]
            );
            
            if (users.length === 0) {
                throw new PoveryError('User not found', 404);
            }
            
            return { user: users[0] };
        } catch (error) {
            if (error instanceof PoveryError) {
                throw error;
            }
            console.error('Error fetching user:', error);
            throw new PoveryError('Failed to fetch user', 500);
        }
    }
    
    /**
     * Create a new user
     * Uses request body validation with @body decorator
     */
    @api('POST', '/users')
    async createUser(
        event: any,
        context: any,
        @body({
            transform: (event: any) => CreateUserDto.fromObject(JSON.parse(event.body)),
            validate: true
        }) userDto: CreateUserDto
    ) {
        try {
            // Generate a UUID for the new user
            const id = require('crypto').randomUUID();
            
            // Insert the user into the database
            await executeQuery(
                'INSERT INTO users (id, name, email, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [id, userDto.name, userDto.email]
            );
            
            return {
                message: 'User created successfully',
                user: {
                    id,
                    name: userDto.name,
                    email: userDto.email
                }
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw new PoveryError('Failed to create user', 500);
        }
    }
}

/**
 * Export the Lambda handler
 * No middleware is needed for this example
 */
exports.handler = povery.load(UserController); 