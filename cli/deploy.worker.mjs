import {workerData} from 'worker_threads';
import {deployFunction} from "./function.mjs";
import chalk from 'chalk';

const {lambda, environment} = workerData;


deployFunction(lambda, {environment})
    .catch(err => {
        console.error(chalk.red(err))
    })