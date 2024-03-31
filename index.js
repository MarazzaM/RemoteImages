const express = require('express');
const sharp = require('sharp');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload')
const {  S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config()
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const app = express();

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Increase payload size limit (e.g., 100MB)
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(fileUpload())

const port = 8000;
// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow requests from any origin (replace '*' with specific origins if needed)
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow GET, POST, OPTIONS requests
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // Allow specific headers
  next();
});

app.use(express.json());

app.post('/compress-upload', async (req, res) => {
  let images = req.files.images;
  if (!Array.isArray(images)) {
    images = [images];
  }
  const urls = [];
  for (const image of images) {
    try {
      let newBuffer = image.data;
      const flipAndWatermark = req.query.flipAndWatermark === 'true';

      if (flipAndWatermark) {
        newBuffer = await flipAndWatermarkImage(image.data);
      }

      const compressedBuffer = await compressImage(newBuffer, 100);
      const url = await uploadToS3(compressedBuffer);
      urls.push(url);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }
  console.log('Urls', urls);
  return res.status(200).send({ message: 'File upload', urls: urls });
});

async function flipAndWatermarkImage(imageBuffer) {
  const watermarkPath = path.join(__dirname, 'f1.png');
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
  let currentQuality = 80; // Initial quality setting

  while (compressedImageBuffer.length > targetSizeKB * 1024 && currentQuality > 0) {
    try {
      compressedImageBuffer = await sharp(compressedImageBuffer)
        .resize({ width: 800, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
        .jpeg({ quality: currentQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer();

      currentQuality -= 10;
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
