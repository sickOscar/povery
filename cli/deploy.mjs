import {getLocalLambdasList} from "./utils.mjs";
import {Worker, workerData} from 'worker_threads';
import * as path from 'path';
import fs from "fs-extra";
const MAX_CONCURRENT_TASKS = 1;

export async function deployAllFunctions({environment}) {
    const lambdasList = getLocalLambdasList();

    fs.removeSync(path.resolve('.tmp'));


    // split lambdaList into chunks of MAX_CONCURRENT_TASKS elements
    const chunks = [];
    for (let i = 0; i < lambdasList.length; i += MAX_CONCURRENT_TASKS) {
        chunks.push(lambdasList.slice(i, i + MAX_CONCURRENT_TASKS));
    }
    
    for(const tasks of chunks) {
        await Promise.all(tasks.map(async (lambda) => {
            await createLambdaWorker(lambda, environment);
        }));
    }

}

function createLambdaWorker(lambda, environment) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve('cli/deploy.worker.mjs'), {
            workerData: {lambda, environment}
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}