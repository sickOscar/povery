import * as joi from 'joi';

/**
 * Decorator for validating the payload of a RPC request. Uses Joi for validation.
 *
 * Example usage:
 *
 * ```
 * import { validatePayload } from './common/validatePayload';
 *
 * const validationRules = {
 *   name: joi.string().required(),
 *   age: joi.number().integer().min(0).max(150),
 * };
 *
 * class Controller {
 *   @validatePayload(validationRules)
 *   static async rpcAction(payload) {
 *     // this is not executed if the payload is invalid
 *   }
 * }
 * ```
 *
 * @param validationRules
 */
export const validatePayload = (validationRules: { [key: string]: joi.Schema }): any => {
	return async (target: Function, name: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		target[name] = async function (payload: any, ...otherArgs: any[]) {
			const schema = getValidationSchema(payload);

			const validation = schema.validate(payload);

			if (validation.error) {
				throw new Error(validation.error.message);
			}

			return originalMethod.apply(this, [payload, ...otherArgs]);
		};

		function getValidationSchema(payload: any) {
			return joi.object({
				...validationRules,
			});
		}
	};
};
