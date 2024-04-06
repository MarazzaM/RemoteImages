const { response } = require("express");


const validarCron = (req, res = response, next) => {
    console.log('req.headers', req.headers);
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Cron secret: ', process.env.CRON_SECRET);
        return res.status(401).end('Unauthorized');
      }
    next();
}

module.exports = {
    validarCron
}