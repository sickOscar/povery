import { PoveryMiddleware, Auth } from 'povery';
import { APIGatewayEvent, Context } from 'aws-lambda';

/**
 * This middleware demonstrates how to augment the Cognito user with additional data from a database.
 * 
 * Use case: A developer uses Cognito for authentication, but stores additional user data in a separate database.
 * This middleware retrieves the user data from the database and adds it to the user object in the execution context.
 */

// Mock database client - in a real application, this would be your actual database client
class UserDatabase {
  // Mock database of users with additional profile information
  private static users: Record<string, any> = {
    'cognito-user-id-1': {
      firstName: 'John',
      lastName: 'Doe',
      preferences: {
        theme: 'dark',
        notifications: true
      },
      subscription: 'premium',
      lastLogin: '2023-06-15T10:30:00Z'
    },
    'cognito-user-id-2': {
      firstName: 'Jane',
      lastName: 'Smith',
      preferences: {
        theme: 'light',
        notifications: false
      },
      subscription: 'basic',
      lastLogin: '2023-06-14T08:45:00Z'
    }
  };

  // Simulate database query with a promise
  static async getUserById(userId: string): Promise<any> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        const userData = this.users[userId] || null;
        resolve(userData);
      }, 100);
    });
  }
}

/**
 * Middleware that fetches additional user data from a database and adds it to the user object
 * in the execution context using the new setAttribute method.
 */
export const userDataMiddleware = (): PoveryMiddleware => {
  return {
    setup: async (event: APIGatewayEvent, context: Context) => {
      try {
        // Get the user from the execution context (populated by the Authorizer middleware)
        const user = Auth.getUser();
        
        if (!user) {
          console.log('No user found in execution context');
          return;
        }
        
        // Get the user ID from Cognito claims
        const userId = user.sub;
        
        // Fetch additional user data from the database
        const userData = await UserDatabase.getUserById(userId);
        
        if (!userData) {
          console.log(`No additional data found for user ${userId}`);
          return;
        }
        
        // Add the user data to the user object in the execution context
        Auth.setAttribute('firstName', userData.firstName);
        Auth.setAttribute('lastName', userData.lastName);
        Auth.setAttribute('preferences', userData.preferences);
        Auth.setAttribute('subscription', userData.subscription);
        Auth.setAttribute('lastLogin', userData.lastLogin);
        
        console.log('User data augmented with database information');
      } catch (error) {
        console.error('Error in userDataMiddleware:', error);
      }
    },
    teardown: (event: APIGatewayEvent, context: Context, result: any) => result
  };
}; 