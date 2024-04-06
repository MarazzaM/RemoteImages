
require('dotenv').config();
const sharp = require('sharp');
const {  S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

function getImageKey(imageUrl) {
  return imageUrl.split('/').pop();
}

const deleteImageClientS3 = async (url) => {
  const key = getImageKey(url);
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `images/${key}`,
  });
  return await client.send(command);
};

const uploadImage = async (req, res) => {
    let images = req.files.images;
    if (!Array.isArray(images)) {
      images = [images];
    }
    const urls = [];
    for (const image of images) {
      try {
        let newBuffer = image.data;
  
        // Compress the image
        const compressedBuffer = await compressImage(newBuffer, 400);
  
        const flipAndWatermark = req.query.flipAndWatermark === 'true';
  
        if (flipAndWatermark) {
          // Apply watermark to the compressed image
          newBuffer = await flipAndWatermarkImage(compressedBuffer);
        }
  
        // Upload the image to S3
        const url = await uploadToS3(newBuffer);
        urls.push(url);
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
    console.log('Urls', urls);
    return res.status(200).send({ message: 'File upload', urls: urls });
  };


async function flipAndWatermarkImage(imageBuffer) {
    const watermarkPath = path.join(__dirname, '../f1.png');
    const watermarkBuffer = fs.readFileSync(watermarkPath);
  
    // Resize the watermark image to match the dimensions of the image being processed
    const { width, height } = await sharp(imageBuffer).metadata();
    const resizedWatermarkBuffer = await sharp(watermarkBuffer).resize(width, height).toBuffer();
  
    // Flip the image horizontally
    const flippedImageBuffer = await sharp(imageBuffer).flop().toBuffer();
  
    // Apply the watermark to the flipped image
    const watermarkedBuffer = await sharp(flippedImageBuffer)
      .composite([{ input: resizedWatermarkBuffer, gravity: 'southeast' }])
      .toBuffer();
  
    return watermarkedBuffer;
  }
  
  
  
  
  async function compressImage(imageBuffer, targetSizeKB) {
    let compressedImageBuffer = imageBuffer;
    let currentQuality = 95; // Initial quality setting
  
    while (compressedImageBuffer.length > targetSizeKB * 1024 && currentQuality > 0) {
      try {
        compressedImageBuffer = await sharp(compressedImageBuffer)
          .resize({ width: 800, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: currentQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
          .toBuffer();
  
        currentQuality -= 1;
      } catch (error) {
        console.error('Error compressing image:', error);
        throw error;
      }
    }
  
    return compressedImageBuffer;
  }
  
  async function uploadToS3(imageBuffer) {
    const extension = 'jpeg'; // Assuming the extension of the image after compression
    const key = `images/${uuidv4()}.${extension}`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg', // Adjust content type accordingly
    };
  
    try {
      const data = await client.send(new PutObjectCommand(uploadParams));
      console.log('Image uploaded to S3:', data);
      return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading image to S3:', error);
      throw error;
    }
  }


  const cleanningImages = async (req, res) => {
    console.log('Body', req.body)
    const imagesUrls = req.body.images;
    console.log( 'Images', imagesUrls)
    const urlsSuccessDeleted = [];
    try {
      for (const url of imagesUrls) {
          await deleteImageClientS3(url);
      }
      console.log('Urls', urlsSuccessDeleted);
      return res.status(200).send({ message: 'Deleted files:' });
    }
    catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).send({ message: 'Error deleting files:', error });
    }
  };


  module.exports = {
    uploadImage,
    cleanningImages
  }