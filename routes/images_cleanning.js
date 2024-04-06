const { Router } = require('express');
const { cleanningImages } = require('../controllers/compress_upload');
const { validarCron } = require('../middlewares/validar-cron');

const router = Router();

router.post('/',[validarCron],  cleanningImages);

module.exports = router;