/**
 * Povery Error is an error with a status code as the second argument.
 */
export class PoveryError extends Error {
    constructor(message: string, public statusCode: number, public errorData?: any) {
        super(message);
    }

}