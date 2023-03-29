import {validateSync} from 'class-validator';

export function validateParam(validators: PropertyDecorator[], name: string, value: any) {
    if (validators.length === 0) {
        return;
    }
    class ValidationClass {}
    Object.defineProperty(ValidationClass.prototype, name, {writable: true});
    const fieldDescriptor = Object.getOwnPropertyDescriptor(ValidationClass.prototype, name);
    Reflect.decorate(validators, ValidationClass.prototype, name, fieldDescriptor);
    const validationObject: any = new ValidationClass();
    validationObject[name] = value;
    const validationErrors = validateSync(validationObject);
    if (validationErrors.length > 0) {
        throw {validationErrors};
    }
}