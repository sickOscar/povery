import fs from "fs-extra";
import * as standardfs from "fs"
import ora from "ora";
import AdmZip from "adm-zip";
import aws from "aws-sdk";
import util from "util";
import {exec as execChildProcess} from "child_process";
const exec = util.promisify(execChildProcess);


export async function uploadLambdaLayers(functionName) {

    await installNpmModules(functionName);

    const zipPath = await makeZipFile(functionName);

    return await uploadOnS3(functionName, zipPath);

}

async function installNpmModules(functionName) {
    const spinner = ora(`Installing npm packages`).start()
    try {

        // if temporary build_folder does not exists, create it
        const tempBuildFolderPath = path.resolve(`./.layers/${functionName}/nodejs`)

        if (fs.pathExists(tempBuildFolderPath)) {
            fs.removeSync(`./.layers`)
        }

        fs.mkdirpSync(`${tempBuildFolderPath}`);

        standardfs.copyFileSync(
            path.resolve(`./lambda/${functionName}/package.json`),
            path.resolve(`${tempBuildFolderPath}/package.json`)
        );
        const {stderr, stdout} = await exec(`yarn install --cwd ${tempBuildFolderPath} --production=true`);
        console.error(stderr)
        console.log(stdout)

        // spawn a cli process to do npm install on the folder
        // const {stdout, stderr} = await exec(`cd ./lambda/${functionName} && yarn install --production=true`);
        spinner.stop();

    } catch (err) {
        spinner.stop();
        throw err;
    }
}

async function makeZipFile(functionName) {
    const zip = new AdmZip();

    const addingSpinner = ora(`Adding ${functionName} to zip`).start()
    zip.addLocalFolder(path.resolve(`./.layers/${functionName}`));
    addingSpinner.succeed(`Added ${functionName} to zip`)


    const zipPath = path.resolve(`./lambda/${functionName}/.dist/layer/${functionName}.zip`);
    const zippingSpinner = ora(`Writing zip to ${zipPath}`).start()
    await zip.writeZipPromise(zipPath);
    zippingSpinner.succeed(`Wrote zip to ${zipPath}`);
    return zipPath;
}

async function uploadOnS3(functionName, zipPath) {

    const uploadSpinner = ora(`Uploading ${functionName} layer to AWS`).start();
    let uploadProgress = 0;
    const s3Key = `${functionName}_Layer/layer.zip`
    const managedUpload = new aws.S3.ManagedUpload(
        {
            params: {
                Bucket: process.env.LAMBDA_DEPLOY_BUCKET,
                Key: s3Key,
                Body: standardfs.createReadStream(zipPath)
            }
        }
    )
    managedUpload.on('httpUploadProgress', function (evt) {
        uploadProgress = evt.loaded / evt.total;
        uploadSpinner.text = `Uploading ${functionName} layer to AWS (${Math.round(uploadProgress * 100)}% of ${Math.round(evt.total / 1024 / 1024)}MB)`;
    });
    managedUpload.send();

    await managedUpload.promise();

    uploadSpinner.succeed(`Uploaded ${functionName} layer to AWS (${s3Key})`);

}

