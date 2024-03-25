const express = require('express');
const sharp = require('sharp');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload')
const {  S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config()
const { v4: uuidv4 } = require('uuid');
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
    const newBUffer = await compressImage(image.data, 100 )//targetSizeKB)
    image.data = newBUffer;
    const u = await uploadToS3(image);
    urls.push(u);
  }
  console.log('Urls', urls);
  return res.status(200).send({ message: 'File upload', urls: urls });
});
// })

app.post('/compress-image', async (req, res) => {
  try {
    const { imageBuffer, targetSizeKB, images } = req.body;
    const compressedImageBuffer = await compressImage(imageBuffer, targetSizeKB);     
    res.send({ compressedImageBuffer });
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function compressImage(imageBuffer, targetSizeKB) {
  // console.log('Received image buffer:', imageBuffer, 'bytes')
  let compressedImageBuffer = imageBuffer;
  let currentQuality = 80; // Initial quality setting

  while (compressedImageBuffer.length > targetSizeKB * 1024 && currentQuality > 0) {
    try {
      // Compress the image using sharp
      compressedImageBuffer = await sharp(compressedImageBuffer)
        .resize({ width: 800, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
        .jpeg({ quality: currentQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer();

      currentQuality -= 10;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error; // Rethrow the error to be handled at a higher level
    }
  }

  return compressedImageBuffer;
}

async function uploadToS3(image) {
  const extension = image.mimetype.split('/')[1];
  const key = `images/${uuidv4()}.${extension}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key, // `images/${uuidv4()}.${extension}`,
    Body: image.data,
    ContentType: image.mimetype,
  };

  try {
    const data = await client.send(new PutObjectCommand(uploadParams));
    console.log('Image uploaded to S3:', data);
    // return data.Location;
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw error;
  }
}

// 

async function flipAndWatermarkImage(fileBuffer, watermarkPath) {
  // Load the watermark image
  const watermarkBuffer = await sharp(watermarkPath)
      .resize(200) // Resize watermark
      .toBuffer();

  return sharp(fileBuffer)
      .flip() // Flip the image horizontally
      .composite([{ input: watermarkBuffer, gravity: 'southeast' }]) // Add watermark
      .toBuffer();
}

// const processedBuffer = await flipAndWatermarkImage(file.buffer, path.join(__dirname, 'logo.png'))

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


