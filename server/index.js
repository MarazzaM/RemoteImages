require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.DEFAULT_PORT || 8000;
    this.compress_upload = "/compress-upload";

    //Middlewares
    this.middelwares();
    //Rutas de la app
    this.routes();
  }

  middelwares() {
    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*"); // Allow requests from any origin (replace '*' with specific origins if needed)
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); // Allow GET, POST, OPTIONS requests
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      ); // Allow specific headers
      next();
    });
    // Increase payload size limit (e.g., 100MB)
    this.app.use(bodyParser.json({ limit: "100mb" }));
    this.app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
    this.app.use(fileUpload());

    this.app.use(express.json());

  };

  routes() {
    this.app.use(this.compress_upload, require("../routes/compress_upload"));
  };

  listen() {
    this.app.listen(this.port, () => {
      console.log("servidor escuchando en el puerto", this.port);
    });
  };
};

module.exports = Server;
