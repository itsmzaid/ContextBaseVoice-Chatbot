import multer from "multer";
import path from "path";
import fs from "fs";
import randomNumber from "./randomNumber.js";

const uploadDir = "storage/uploads";
const audioDir = "storage/audio";

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  // Allow documents and audio files
  const allowedMimeTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    // Audio formats
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/m4a",
    "audio/aac",
    "audio/webm",
    "audio/flac",
  ];

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".wav",
    ".mp3",
    ".m4a",
    ".aac",
    ".ogg",
    ".webm",
    ".flac",
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${
          file.mimetype
        }. Allowed types: ${allowedMimeTypes.join(", ")}`
      ),
      false
    );
  }
};

// Use memory storage for all files to ensure buffer is available
const storage = multer.memoryStorage();

const uploadFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files
  },
}).fields([
  { name: "documents", maxCount: 5 }, // Multiple documents for agents
  { name: "audio", maxCount: 1 }, // Single audio file for messages
]);

export default uploadFiles;
