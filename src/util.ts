import * as AWSXRay from "aws-xray-sdk";

export function isDevelopment() {
    return process.env.deploymentStage === 'dev';
}

export function isStaging() {
    return process.env.deploymentStage === 'staging';
}

export function isProduction() {
    return process.env.deploymentStage === 'prod';
}

export function isLocal() {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'integration';
}
export function getEnvValue(key: string) {
    return process.env[key] || "";
}

export function startXRayTracing(segmentName: string) {
    if (isLocal()) {
        return
    }
    const segment = AWSXRay.getSegment();
    if (segment) {
        return segment.addNewSubsegment(segmentName);
    }
}

export function endXRayTracing(subsegment) {
    if (subsegment) {
        subsegment.close();
    }
}

export const startTimer = () => process.hrtime();

export const endTimer = (start, note) => {
    const precision = 3; // 3 decimal places
    const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    if (process.env.LOG_LEVEL === "DEBUG") {
        console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
    }
}

/**
 * Safely parses a JSON string, returning a default value if parsing fails
 * @param jsonString The JSON string to parse
 * @param defaultValue The default value to return if parsing fails (default: {})
 * @returns The parsed JSON object or the default value
 */
export function safeJsonParse(jsonString: string | null | undefined, defaultValue: any = {}): any {
    try {
        if (!jsonString) return defaultValue;
        const parsed = JSON.parse(jsonString);
        return parsed || defaultValue;
    } catch (err) {
        console.error('JSON parsing error:', err);
        return defaultValue;
    }
}

/**
 * Masks sensitive data in a string or object to prevent leaking sensitive information in logs
 * @param data The data to mask (string or object)
 * @returns The masked data as a string
 */
export function maskSensitiveData(data: any): string {
    if (data === null || data === undefined) {
        return '';
    }
    
    if (typeof data !== 'string') {
        try {
            data = JSON.stringify(data);
        } catch (err) {
            console.error('Error stringifying data for masking:', err);
            return '[Error: Could not stringify data for masking]';
        }
    }
    
    if (!data) return '';
    
    // Mask passwords
    data = data.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"********"');
    data = data.replace(/"passwd"\s*:\s*"[^"]*"/gi, '"passwd":"********"');
    data = data.replace(/"pass"\s*:\s*"[^"]*"/gi, '"pass":"********"');
    
    // Mask tokens
    data = data.replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"********"');
    data = data.replace(/"accessToken"\s*:\s*"[^"]*"/gi, '"accessToken":"********"');
    data = data.replace(/"refreshToken"\s*:\s*"[^"]*"/gi, '"refreshToken":"********"');
    data = data.replace(/"idToken"\s*:\s*"[^"]*"/gi, '"idToken":"********"');
    data = data.replace(/"authorization"\s*:\s*"[^"]*"/gi, '"authorization":"********"');
    
    // Mask API keys
    data = data.replace(/"apiKey"\s*:\s*"[^"]*"/gi, '"apiKey":"********"');
    data = data.replace(/"api_key"\s*:\s*"[^"]*"/gi, '"api_key":"********"');
    data = data.replace(/"x-api-key"\s*:\s*"[^"]*"/gi, '"x-api-key":"********"');
    
    // Mask secrets
    data = data.replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"********"');
    data = data.replace(/"secretKey"\s*:\s*"[^"]*"/gi, '"secretKey":"********"');
    data = data.replace(/"secret_key"\s*:\s*"[^"]*"/gi, '"secret_key":"********"');
    
    // Mask credit card numbers
    data = data.replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g, '$1-****-****-$4');
    
    // Mask SSNs
    data = data.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
    
    return data;
}

/**
 * Removes sensitive fields from error data
 * @param data The error data to sanitize
 * @returns Sanitized error data or undefined if no data
 */
export function sanitizeErrorData(data: any): any | undefined {
    // Return null as is
    if (data === null) return null;
    
    // Return undefined as is
    if (data === undefined) return undefined;
    
    // For primitive types, return as is
    if (typeof data !== 'object') {
        return data;
    }
    
    // For arrays, sanitize each item
    if (Array.isArray(data)) {
        return data.map(item => sanitizeErrorData(item));
    }
    
    // For objects, create a sanitized copy
    const sanitized = { ...data };
    
    // List of sensitive field names to remove
    const sensitiveFields = [
        'password', 'passwd', 'pass',
        'token', 'accessToken', 'refreshToken', 'idToken', 'authorization',
        'apiKey', 'api_key', 'x-api-key',
        'secret', 'secretKey', 'secret_key',
        'ssn', 'creditCard', 'cardNumber'
    ];
    
    // Remove sensitive fields
    sensitiveFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
        }
    });
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeErrorData(sanitized[key]);
        }
    }
    
    return sanitized;
}

/**
 * Securely handles errors by logging the full error and returning a sanitized error response
 * @param err The error to handle
 * @param includeErrorData Whether to include error data in the response (default: true)
 * @returns A sanitized error response
 */
export function secureErrorHandler(err: any, includeErrorData: boolean = true): any {
    // Log the full error for debugging (masked to prevent sensitive data in logs)
    console.error('Error:', maskSensitiveData(err));
    
    // Get the error code
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    
    // Get the error message
    let errorMessage = err.message || String(err);
    
    // In production, use generic error messages for server errors
    if (isProduction() && statusCode >= 500) {
        errorMessage = 'An unexpected error occurred';
    }
    
    // Prepare the error response
    const errorResponse: any = {
        errorMessage,
        errorCode
    };
    
    // Include sanitized error data if available and allowed
    if (includeErrorData && err.errorData) {
        // In production, only include error data for client errors (4xx)
        if (!isProduction() || statusCode < 500) {
            errorResponse.errorData = sanitizeErrorData(err.errorData);
        }
    }
    
    return errorResponse;
}
