const AWS = require('aws-sdk'); 
const fs = require('fs');
const os = require('os');
const uuidv4 = require('uuid/v4');
const {promisify} = require('util');
const im = require ('imagemagick');

/**
 * This is a totally outdated version built for Node 8 .. Keeping it for reference
 */

/**
 * @description: We need to convert the callback-structure of a couple packages to promises
 * @description: Turns out we did NOT have to do this, this code was made to target Node 8
 */
const resizeAsync = promisify(im.resize);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
/**
 * **********************************************************************************
 */
AWS.config({
    region: 'us-east-1'
});
const s3 = new AWS.S3();


exports.handler = async (event) => {
    let filesProcessed = event.Records.map( async (record) => {
        let bucket = record.s3.bucket.name;
        let filename = record.s3.object.key;

        // Get File from S3
        var params = {
            Bucket: bucket,
            Key: filename
        };
        let inputData = await s3.getObject(params).promise();
        // Resize File
        let tempFile = os.tmpdir() + '/' + uuidv4() + '.jpg';
        let resizeArgs = {
            scrData: inputData.Body,
            dstPath: tempFile,
            width: 300
        };
        await resizeAsync(resizeArgs);

        // Read Resized File
        let resizedData = await readFileAsync(tempFile);

        // Upload New Resized File To S3
        let targetFileName = filename.substring(0, filename.lastIndexOf('.')) + '-small.jpg';
        var params = {
            Bucket: bucket + '-dest',
            Key: targetFileName,
            body: new Buffer(resizedData),
            ContentType: 'image/jpeg'
        };
        await s3.putObject(params).promise();
        return await unlinkAsync(tempFile);
    });

    await Promise.all(filesProcessed);
    console.log('Image Resize Complete');
    return "done";
}