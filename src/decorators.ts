require('reflect-metadata');
const SubMethods = Symbol('SubMethods');

/**
 * This function defines a decorator that can be applied to class
 * methods in order to associate them with a particular HTTP method
 * (e.g., "GET", "POST", etc.) and path.
 *
 * It uses express path-to-regexp to match the path, so it uses express routes.
 *
 *
 * @param method
 * @param path
 */
export function api(method: string, path: string | RegExp): any {
    return  (target, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        target[SubMethods] = target[SubMethods] || new Map();
        target[SubMethods].set(propertyKey, {
            ...target[SubMethods].get(propertyKey),
            path,
            method,
            propertyKey
        });
    }
}

export function acl(roles: string[]): any {
    return  (target, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        target[SubMethods] = target[SubMethods] || new Map();
        target[SubMethods].set(propertyKey, {
            ...target[SubMethods].get(propertyKey),
            acl: roles
        });
    }
}


export function controller<T extends { new(...args: any[]): {} }>(Base: T) {
    return class Controller extends Base {
        static __ROUTES__ = {};
        static __ACL__ = {};
        constructor(...args: any[]) {
            super(...args);
            const methods = Base.prototype[SubMethods];

            if (methods) {
                methods.forEach((method: any) => {
                    if (!Controller.__ROUTES__[method.method]) {
                        Controller.__ROUTES__[method.method] = {};
                    }
                    Controller.__ROUTES__[method.method][method.path] = method.propertyKey;

                    if (!Controller.__ACL__[method.propertyKey]) {
                        Controller.__ACL__[method.propertyKey] = [];
                    }
                    Controller.__ACL__[method.propertyKey] = method.acl;

                })
            }
        }
    };
}