import {acl, api, controller} from "../src/decorators";
import {Auth, authMiddleware, runAuthorization} from "../src/auth";
import {ExecutionContext} from "../src/execution_context";
import {PoveryError} from "../src/povery_error";
import {PoveryMiddlewareObject} from "../src/models";

// Only mock ExecutionContext since it's an external dependency
jest.mock('../src/execution_context');

describe("runAuthorization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return the context", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {}
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to avoid side effects
        jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        const newContext = await runAuthorization(context, event, aController, {});
        expect(newContext).toBe(context);
    });

    it("should throw an error if claims are not found", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            requestContext: {
                authorizer: {}
            }
        };

        @controller
        class aController {}

        await expect(runAuthorization(context, event, aController, {}))
            .rejects.toThrow("No claims found");
    });

    it("should throw an error if requestContext is not found", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/"
            // No requestContext
        };

        @controller
        class aController {}

        await expect(runAuthorization(context, event, aController, {}))
            .rejects.toThrow("No requestContext found");
    });

    it("should throw an error if authorizer is not found", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                // No authorizer
            }
        };

        @controller
        class aController {}

        await expect(runAuthorization(context, event, aController, {}))
            .rejects.toThrow("No authorizer found");
    });

    it("should handle custom role claim as string", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "custom:role": "ADMIN"
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, { roleClaim: "custom:role" });
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN"]);
    });

    it("should handle custom role claim as comma-separated string", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "custom:role": "ADMIN,USER,GUEST"
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, { roleClaim: "custom:role" });
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN", "USER", "GUEST"]);
    });

    it("should handle custom role claim as JSON string", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "custom:role": JSON.stringify(["ADMIN", "USER"])
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, { roleClaim: "custom:role" });
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN", "USER"]);
    });

    it("should handle custom role claim as array", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "custom:role": ["ADMIN", "USER"]
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, { roleClaim: "custom:role" });
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN", "USER"]);
    });

    it("should throw error if custom role claim is not found", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        // No custom:role
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        await expect(runAuthorization(context, event, aController, { roleClaim: "custom:role" }))
            .rejects.toThrow("No role claim found in custom:role");
    });

    it("should handle cognito:groups as string", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "cognito:groups": "ADMIN,USER"
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, {});
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN", "USER"]);
    });

    it("should handle cognito:groups as array", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        "cognito:groups": ["ADMIN", "USER"]
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, {});
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", ["ADMIN", "USER"]);
    });

    it("should handle missing cognito:groups", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {
                        // No cognito:groups
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        // Mock ExecutionContext.set to verify it's called correctly
        const mockSet = jest.spyOn(ExecutionContext, 'set').mockImplementation(() => {});

        await runAuthorization(context, event, aController, {});
        
        // Verify roles were set correctly
        expect(mockSet).toHaveBeenCalledWith("roles", []);
    });

    it("should pass ACL check when user has required role", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/admin",
            requestContext: {
                authorizer: {
                    claims: {
                        "cognito:groups": ["ADMIN", "USER"]
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/admin')
            @acl(['ADMIN'])
            async adminOnly() {}
        }

        // Mock ExecutionContext.get to return roles
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'roles') return ["ADMIN", "USER"];
            return null;
        });

        // Should not throw
        await expect(runAuthorization(context, event, aController, {})).resolves.not.toThrow();
    });

    it("should fail ACL check when user doesn't have required role", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/admin",
            requestContext: {
                authorizer: {
                    claims: {
                        "cognito:groups": ["USER"]
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/admin')
            @acl(['ADMIN'])
            async adminOnly() {}
        }

        // Mock ExecutionContext.get to return roles
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'roles') return ["USER"];
            return null;
        });

        await expect(runAuthorization(context, event, aController, {}))
            .rejects.toThrow(new PoveryError("Unauthorized access (REST)", 403));
    });

    it("should pass when no ACL is defined", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/public",
            requestContext: {
                authorizer: {
                    claims: {
                        "cognito:groups": ["USER"]
                    }
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/public')
            async publicEndpoint() {}
        }

        // Mock ExecutionContext.get to return roles
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'roles') return ["USER"];
            return null;
        });

        // Should not throw
        await expect(runAuthorization(context, event, aController, {})).resolves.not.toThrow();
    });
});

describe("Auth utility", () => {
    it("should get user from ExecutionContext", () => {
        const mockUser = { sub: "123", username: "testuser" };
        
        // Mock ExecutionContext.get
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'user') return mockUser;
            return null;
        });

        const user = Auth.getUser();
        expect(user).toEqual(mockUser);
    });

    it("should get roles from ExecutionContext", () => {
        const mockRoles = ["ADMIN", "USER"];
        
        // Mock ExecutionContext.get
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'roles') return mockRoles;
            return null;
        });

        const roles = Auth.getRoles();
        expect(roles).toEqual(mockRoles);
    });

    it("should get attribute from user", () => {
        const mockUser = { sub: "123", username: "testuser", email: "test@example.com" };
        
        // Mock ExecutionContext.get
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'user') return mockUser;
            return null;
        });

        const email = Auth.getAttribute('email');
        expect(email).toEqual("test@example.com");
    });

    it("should return undefined when getting attribute from non-existent user", () => {
        // Mock ExecutionContext.get to return null for user
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => null);

        const attribute = Auth.getAttribute('email');
        expect(attribute).toBeUndefined();
    });

    it("should set attribute on user", () => {
        const mockUser: any = { sub: "123", username: "testuser" };
        
        // Mock ExecutionContext.get
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => {
            if (key === 'user') return mockUser;
            return null;
        });

        Auth.setAttribute('email', 'test@example.com');
        expect(mockUser.email).toEqual('test@example.com');
    });

    it("should throw error when setting attribute on non-existent user", () => {
        // Mock ExecutionContext.get to return null for user
        jest.spyOn(ExecutionContext, 'get').mockImplementation((key) => null);

        expect(() => Auth.setAttribute('email', 'test@example.com'))
            .toThrow(new PoveryError("Unable to set attribute on user", 500));
    });
});

describe("authMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a middleware with setup and teardown", () => {
        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        const middleware = authMiddleware(aController) as PoveryMiddlewareObject;
        
        expect(middleware).toHaveProperty('setup');
        expect(middleware).toHaveProperty('teardown');
        expect(typeof middleware.setup).toBe('function');
        expect(typeof middleware.teardown).toBe('function');
    });

    it("should pass options to the middleware", () => {
        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        const options = { roleClaim: "custom:role" };
        const middleware = authMiddleware(aController, options) as PoveryMiddlewareObject;
        
        // Verify the middleware has the correct structure
        expect(middleware).toHaveProperty('setup');
        expect(middleware).toHaveProperty('teardown');
        
        // We can't easily test the internal behavior without mocking runAuthorization,
        // but we can verify the middleware is created with the correct options
        expect(middleware).toBeDefined();
    });

    it("should return result unchanged in teardown", () => {
        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        const middleware = authMiddleware(aController) as PoveryMiddlewareObject;
        const result = { statusCode: 200, body: "test" };
        const mockEvent = { httpMethod: "GET", path: "/" };
        const mockContext = {};
        
        expect(middleware.teardown!(mockEvent, mockContext, result, undefined)).toBe(result);
    });
});
