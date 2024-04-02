const { Router } = require('express');
const { uploadImage } = require('../controllers/compress_upload');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.post('/', [validarJWT], uploadImage);

module.exports = router;