#!/usr/bin/env node
import { program } from 'commander';

import dotenv from 'dotenv';
import inquirer from 'inquirer';

import { deployApiGateway } from './cli/api.mjs';
import * as deploy from './cli/deploy.mjs';
import * as functionCommand from './cli/function.mjs';
import * as layers from './cli/layers.mjs';
import * as promote from './cli/promote.mjs';
import * as utils from './cli/utils.mjs';
import * as version from './cli/version.mjs';
import * as server from './cli/server.mjs';
// this notation has been used to avoid conflicts with the nodejs modules
const { handleFunctionCommand } = functionCommand;
const { getLocalLambdasList } = utils;
const { deployAllFunctions } = deploy;
const { versionAllFunctions } = version;
const { promoteAllFunctions } = promote;
const { uploadLambdaLayers } = layers;
const { startServer } = server;

dotenv.config();

program.version('0.0.1').description('CLI').enablePositionalOptions();

const start = program
    .command('start')
    .description('Starts the lambda server with serverless-offline')
    .action(() => {
        startServer();
    });

const func = program
    .command('function')
    .description('Lambda function operations (A wizard will guide you through the process if no arguments are provided)')
    .argument('[operation]', 'Operation to perform (deploy, info, build)')
    .argument('[functionName]', 'Function Name')
    .option('-p, --payload <payload>', 'Payload to be used in the function')
    .option('-e, --eventFilename <string>', 'Event file name in folder events')
    .option('-z, --environment <string>', 'Environment', 'dev')
    .option('--auth', 'load claims file, or defaults to claims.json')
    .action(async (operation, functionName) => {
        const lambdaSteps = [
            {
                type: 'list',
                name: 'functionName',
                message: 'Select a Lambda function',
                choices: getLocalLambdasList(),
            },
            {
                type: 'list',
                name: 'operation',
                message: 'What do you want to do?',
                choices: [
                    { name: 'Get Lambda Info', value: 'info' },
                    { name: 'Build Lambda (package only)', value: 'build' },
                    { name: 'Deploy Lambda (build and publish $LATEST)', value: 'deploy' },
                    // {name: "Increment Version of $LATEST", value: "version"},
                    { name: 'Promote Lambda', value: 'promote' },
                    { name: 'Run locally with event', value: 'invoke' },
                    { name: 'Clear', value: 'clean' },
                ],
            },
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure?',
                default: true,
            },
        ];

        if (!operation) {
            inquirer.prompt(lambdaSteps).then((answers) => {
                handleFunctionCommand({
                    ...answers,
                    options: {
                        payload: func.opts().payload,
                        eventFilename: func.opts().eventFilename,
                        environment: func.opts().environment,
                        auth: func.opts().auth,
                    },
                });
            });
        } else {
            await handleFunctionCommand({
                functionName,
                operation,
                confirm: true,
                options: {
                    payload: func.opts().payload,
                    eventFilename: func.opts().eventFilename,
                    environment: func.opts().environment,
                    auth: func.opts().auth,
                },
            });
        }
    });

const deployCommand = program
    .command('deploy')
    .description('Deploys all local lambdas to AWS')
    .option('-y, --yes', 'Autoconfirm prompts')
    .option('-z, --environment <string>', 'Environment', 'dev')
    .action(() => {
        const lambdas = getLocalLambdasList();

        console.log(`Environment`, deployCommand.opts().environment);

        console.log(`You are going to deploy ${lambdas.length} Lambdas`);

        if (deployCommand.opts().yes) {
            return deployAllFunctions(deployCommand.opts());
        }

        inquirer
            .prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure?',
                    default: true,
                },
            ])
            .then((answers) => {
                if (answers.confirm) {
                    return deployAllFunctions(deployCommand.opts());
                }
            });
    });

program
    .command('version')
    .description('Increments the version of the $LATEST Lambda')
    .action(() => {
        const lambdas = getLocalLambdasList();

        console.log(`You are going to increment version to ${lambdas.length} Lambdas`);

        inquirer
            .prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure?',
                    default: true,
                },
            ])
            .then((answers) => {
                if (answers.confirm) {
                    return versionAllFunctions();
                }
            });
    });

program
    .command('layers')
    .alias('layer')
    .description('Uploads a layer to AWS')
    .argument('[functionName]', 'Function Name')
    .action((functionName) => {
        const lambdas = getLocalLambdasList();

        if (functionName) {
            return uploadLambdaLayers(functionName);
        }

        console.log(`You are going to increment version to ${lambdas.length} Lambdas`);

        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'functionName',
                    message: 'Select a Lambda function',
                    choices: getLocalLambdasList(),
                },
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure?',
                    default: true,
                },
            ])
            .then((answers) => {
                if (answers.confirm) {
                    return uploadLambdaLayers(answers.functionName);
                }
            });
    });

program
    .command('promote')
    .description('Promotes the $LATEST Lambda to $RELEASE')
    .argument('[stage]', 'Stage to promote to')
    .action((stage) => {
        const lambdas = getLocalLambdasList();

        console.log(`You are going to promote ${lambdas.length} Lambdas`);

        if (stage) {
            return promoteAllFunctions(stage);
        }

        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'stage',
                    message: 'Stage to promote to',
                    choices: [
                        { name: 'dev -> test', value: 'test' },
                        { name: 'test -> prod', value: 'prod' },
                    ],
                },
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure?',
                    default: true,
                },
            ])
            .then((answers) => {
                if (answers.confirm) {
                    return promoteAllFunctions(answers.stage);
                }
            });
    });

program
    .command('api')
    .description('Deploys API Gateway')
    .action(() => {
        const lambdas = getLocalLambdasList();

        console.log(`You are going to deploy ${lambdas.length} Lambdas`);

        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'stage',
                    message: 'Stage to promote',
                    choices: [
                        { name: 'dev', value: 'dev' },
                        { name: 'staging', value: 'staging' },
                        { name: 'prod', value: 'prod' },
                    ],
                },
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure?',
                    default: true,
                },
            ])
            .then((answers) => {
                if (answers.confirm) {
                    return deployApiGateway();
                }
            });
    });

program.parse();
