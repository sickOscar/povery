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
