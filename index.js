const express = require('express');
const sharp = require('sharp');
const bodyParser = require('body-parser');

const app = express();

// Increase payload size limit (e.g., 100MB)
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


const port = 8000;
// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow requests from any origin (replace '*' with specific origins if needed)
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow GET, POST, OPTIONS requests
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // Allow specific headers
  next();
});

app.use(express.json());

app.post('/compress-image', async (req, res) => {
  try {
    const { imageBuffer, targetSizeKB } = req.body;
    
    // Compress the image using your compressImage function
    const compressedImageBuffer = await compressImage(imageBuffer, targetSizeKB);
    
    // Send the compressed image back as a response
    res.send({ compressedImageBuffer });
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function compressImage(imageBuffer, targetSizeKB) {
  let compressedImageBuffer = imageBuffer;
  let currentQuality = 80; // Initial quality setting

  while (compressedImageBuffer.length > targetSizeKB * 1024 && currentQuality > 0) {
    try {
      // Compress the image using sharp
      compressedImageBuffer = await sharp(compressedImageBuffer)
        .resize({ width: 800, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
        .jpeg({ quality: currentQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer();

      // Decrease quality for next iteration
      currentQuality -= 10;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error; // Rethrow the error to be handled at a higher level
    }
  }

  return compressedImageBuffer;
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
