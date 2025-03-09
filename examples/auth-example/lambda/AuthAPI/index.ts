import { povery, controller, api, acl, Authorizer, Auth } from 'povery';

/**
 * This example demonstrates how to use Povery with AWS Cognito for authentication and authorization.
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
        
        return {
            message: 'You are authenticated!',
            user: {
                username: user.username,
                email: user.email
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
        return {
            message: 'Welcome to the admin dashboard!',
            secretData: 'This is only visible to admins'
        };
    }
}

/**
 * The Authorizer middleware extracts user information from the Cognito authorizer
 * and makes it available through the Auth utility.
 * 
 * By default, it reads roles from Cognito Groups. If your roles are stored in a custom
 * attribute, you can specify it using the roleClaim option.
 */
exports.handler = povery
    .use(Authorizer(AuthController, {
        // If your roles are stored in a custom attribute, uncomment this line:
        // roleClaim: "custom:role"
    }))
    .load(AuthController); 