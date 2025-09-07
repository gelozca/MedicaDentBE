const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3 } = require("../config/s3");

const { v4: uuidv4 } = require("uuid");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const bucketName = process.env.AWS_S3_BUCKET;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuidv4() + "." + ext);
    },
  });

/*const fileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  },
});*/

const fileUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,     
    key: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype]; // ensure correct extension
      const uniqueName = Date.now().toString() + "-" + file.originalname.replace(/\s+/g, "_");
      
      // Different folders for different types of images
      let folder = "pacientes/";
      if (file.fieldname === 'fotoPerfil') {
        folder = "fotoPerfil/";
      } 
      
      cb(null, folder + uniqueName);
    },
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    }
  }),
  limits: {
    fileSize: 1024 * 1024 * 5 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  }
});

// Custom middleware to add the S3 key to the file object
const addS3Key = (req, res, next) => {
  if (req.file) {
    // Store the S3 key instead of the full URL
    req.file.s3Key = req.file.key;
    // Remove the location property to avoid confusion
    delete req.file.location;
  }
  next();
};



module.exports = { fileUpload, addS3Key };