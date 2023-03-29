import 'reflect-metadata';

export const SubMethods = Symbol('SubMethods');
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