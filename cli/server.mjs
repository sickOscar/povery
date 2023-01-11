import {spawn} from 'child_process';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';

function getPoveryConfig() {

    const poveryJsonPath = path.resolve(`./povery.json`);

    if (!fs.lstatSync(poveryJsonPath).isFile()) {
        throw new Error('No povery.json file found. Run "povery init" first.');
    }

    const poveryConf = JSON.parse(fs.readFileSync(poveryJsonPath, 'utf8'));
    console.log(`poveryConf`, poveryConf)

    // project name is the current folder name
    const projectName = process.cwd().split('/').pop();

    let functions = {};
    for (let lambdaName in poveryConf.lambdas) {

        const httpEvents = poveryConf.lambdas[lambdaName];
        const events = httpEvents.map((httpEvent) => {
            const {method, path, authorized} = httpEvent;
            return {
                http: {
                    method,
                    path,
                    cors: true,
                    integration: "lambda_proxy",
                    authorizer: authorized ? {
                        "name": "CustomOfflineAuthorizer",
                        "identitySource": "method.request.header.Authorization"
                    } : undefined
                }
            }

        })

        functions[lambdaName] = {
            handler: `lambda/${lambdaName}/index.handler`,
            runtime: "nodejs16.x",
            events
        };
    }

    if (poveryConf.auth) {
        functions["CustomOfflineAuthorizer"] = {
            handler: `node_modules/povery/cli/offlineAuthorizer.handler`,
            runtime: "nodejs16.x",
        }
    }

    const defaultServerlessConf = {
        "service": projectName,
        "provider": {
            "name": "aws",
            "region": "eu-central-1",
            "environment": {
                "NODE_ENV": "development"
            }
        },
        "custom": {
            "serverless-offline": {
                // "useChildProcesses": true,
                "reloadHandler": true,
            }
        },
        "package": {
            "patterns": [
                "lambda/**/index.ts"
            ]
        },
        functions,
        "plugins": [
            "serverless-plugin-typescript",
            "serverless-offline"
        ]
    }


    const serverlessConfFile = '.serverless.json';
    fs.writeFileSync(serverlessConfFile, JSON.stringify(defaultServerlessConf, null, 4));
    return serverlessConfFile;
}

export async function startServer() {

    const serverlessConfFile = getPoveryConfig();

    const env = _.clone(process.env);

    const serverless = spawn('serverless', [
        'offline',
        'start',
        `--config=${serverlessConfFile}`,
    ], {
        env
    });

    serverless.stdout.on('data', data => {
        process.stdout.write(data.toString());
    });
    serverless.stderr.on('data', error => {
        process.stderr.write(error.toString());
    });
    serverless.on('close', (code) => {
        process.stdout.write(`child process exited with code ${code}`);
    });

    serverless.on('error', console.error);


}