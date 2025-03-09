import { povery, controller, api, acl, Authorizer, Auth } from 'povery';
import { userDataMiddleware } from '../UserDataMiddleware';

/**
 * This example demonstrates how to use Povery with AWS Cognito for authentication and authorization,
 * and how to augment the user with additional data from a database.
 * 
 * Prerequisites:
 * 1. Set up an AWS Cognito User Pool
 * 2. Configure API Gateway with Cognito Authorizer
 * 3. Create user groups in Cognito (e.g., 'USER', 'ADMIN')
 */

@controller
class AuthController {
    /**
     * Endpoint accessible to any authenticated user
     * The @acl decorator ensures only users with the specified roles can access this endpoint
     */
    @api('GET', '/profile')
    @acl(['USER', 'ADMIN'])
    getUserProfile() {
        // Get the authenticated user from the execution context
        const user = Auth.getUser();
        const roles = Auth.getRoles();
        
        // Access the additional user data added by the userDataMiddleware
        const firstName = Auth.getAttribute('firstName');
        const lastName = Auth.getAttribute('lastName');
        const preferences = Auth.getAttribute('preferences');
        const subscription = Auth.getAttribute('subscription');
        
        return {
            message: 'You are authenticated!',
            user: {
                username: user.username,
                email: user.email,
                // Include the additional user data
                firstName,
                lastName,
                preferences,
                subscription
            },
            roles: roles
        };
    }
    
    /**
     * Endpoint accessible only to users with ADMIN role
     */
    @api('GET', '/admin')
    @acl(['ADMIN'])
    getAdminDashboard() {
        // We can also access specific attributes directly
        const subscription = Auth.getAttribute('subscription');
        const lastLogin = Auth.getAttribute('lastLogin');
        
        return {
            message: 'Welcome to the admin dashboard!',
            secretData: 'This is only visible to admins',
            userInfo: {
                subscription,
                lastLogin
            }
        };
    }
    
    /**
     * Example of updating user preferences
     */
    @api('POST', '/preferences')
    @acl(['USER', 'ADMIN'])
    updatePreferences(event) {
        const body = JSON.parse(event.body);
        const preferences = body.preferences;
        
        // Update the user preferences in the execution context
        Auth.setAttribute('preferences', preferences);
        
        // In a real application, you would also update the database
        // await UserDatabase.updateUserPreferences(Auth.getAttribute('sub'), preferences);
        
        return {
            message: 'Preferences updated successfully',
            preferences: Auth.getAttribute('preferences')
        };
    }
}

/**
 * The handler uses two middleware components:
 * 
 * 1. Authorizer: Extracts user information from the Cognito authorizer
 *    and makes it available through the Auth utility.
 * 
 * 2. userDataMiddleware: Fetches additional user data from a database
 *    and adds it to the user object in the execution context.
 */
exports.handler = povery
    .use(Authorizer(AuthController, {
        // If your roles are stored in a custom attribute, uncomment this line:
        // roleClaim: "custom:role"
    }))
    .use(userDataMiddleware())
    .load(AuthController); 