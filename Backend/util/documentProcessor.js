import fs from "fs";
import path from "path";
import mammoth from "mammoth";

export const extractTextFromDocument = async (file) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();

  try {
    switch (fileExtension) {
      case ".txt":
        return await extractTextFromTxt(file);
      case ".pdf":
        return await extractTextFromPdf(file);
      case ".doc":
      case ".docx":
        return await extractTextFromDoc(file);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    throw new Error(`Error extracting text from document: ${error.message}`);
  }
};

const extractTextFromTxt = async (file) => {
  try {
    return file.buffer.toString("utf-8");
  } catch (error) {
    throw new Error(`Error reading TXT file: ${error.message}`);
  }
};

const extractTextFromPdf = async (file) => {
  try {
    let dataBuffer;

    // Check if we have a buffer or need to read from path
    if (file.buffer) {
      dataBuffer = file.buffer;
    } else if (file.path) {
      dataBuffer = fs.readFileSync(file.path);
    } else {
      throw new Error("No file data available (neither buffer nor path)");
    }

    if (!dataBuffer) {
      throw new Error("File data is empty or undefined");
    }

    // Create a temporary file to avoid buffer issues
    const tempPath = path.join(
      process.cwd(),
      "temp",
      `${Date.now()}_${file.originalname}`
    );

    // Ensure temp directory exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write buffer to temporary file
    fs.writeFileSync(tempPath, dataBuffer);

    try {
      // Read the file and parse it
      const fileBuffer = fs.readFileSync(tempPath);
      const pdf = (await import("pdf-parse")).default;
      const data = await pdf(fileBuffer);

      // Clean up temporary file
      fs.unlinkSync(tempPath);

      return data.text;
    } catch (parseError) {
      // Clean up temporary file even if parsing fails
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw parseError;
    }
  } catch (error) {
    throw new Error(`Error parsing PDF file: ${error.message}`);
  }
};

const extractTextFromDoc = async (file) => {
  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Error parsing DOC/DOCX file: ${error.message}`);
  }
};
