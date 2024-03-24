const express = require('express');
const sharp = require('sharp');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const port = 8000;

// Increase payload size limit (e.g., 100MB)
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Multer configuration for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Route for compressing images
app.post('/compress-image', upload.array('images'), async (req, res) => {
  try {
    const images = req.files;

    // Compress each image
    const compressedImages = await Promise.all(images.map(async (image) => {
      const compressedImageBuffer = await compressImage(image.buffer, 100); // Adjust quality or target size as needed
      return { filename: image.originalname, buffer: compressedImageBuffer };
    }));

    res.json(compressedImages);
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Function to compress image buffer
async function compressImage(imageBuffer, targetSizeKB) {
  try {
    return await sharp(imageBuffer)
      .resize({ width: 800, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
