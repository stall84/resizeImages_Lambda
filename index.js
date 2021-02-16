const AWS = require('aws-sdk');
const jimp = require('jimp');
 
const s3 = new AWS.S3();
 
const destinationBucket = 'stall84-images-resized';
 
async function* imageProcessingGenerator(records) {
    let i = 0;
 
    while (i < records.length) {
        let bucket = records[i].s3.bucket.name; // this is the source bucket (part of event record)
        let filename = records[i].s3.object.key;
        let params;
 
        params = {
            Bucket: bucket,
            Key: filename
        };
 
        let file = await s3.getObject(params).promise();
 
        let image = await jimp.read(new Buffer.from(file.Body));
        let imageResized = image.resize(150, 150);
        let resizedBuffer = await imageResized.getBufferAsync('image/jpeg');
        let resizedFileName = filename.substring(0, filename.lastIndexOf('.')) + '-resized.jpg';
 
        params = {
            Bucket: destinationBucket,
            Key: resizedFileName,
            Body: resizedBuffer,
            ContentType: 'image/jpeg'
        };
 
        await s3.putObject(params).promise();
 
        yield {
            destinationBucket,
            resizedFileName
        };
        i++;
    }
}
 
exports.handler = async (event) => {
    for await (let item of imageProcessingGenerator(event.Records)) {
        console.log('image successfully resized, details:')
        console.log(item);
    }
    console.log('end of program, have nice day !');
}