
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const crypto = require('crypto');
const cors = require('cors'); // Import CORS
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS (to allow requests from the browser//to access restricted resources from server)
app.use(cors());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
connectDB();

// Define storage (store files in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define MongoDB Schema
const fileSchema = new mongoose.Schema({
    fileName: String,
    fileHash: String,
    fileData: Buffer,
    uploadTime: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

// Helper function to generate file hash
function generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Upload Route (Ensures No Duplicate Files)
app.post('/upload', upload.array('files', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];

    for (const file of req.files) {
        const fileHash = generateFileHash(file.buffer);

        try {
            // Check if file already exists (by hash)
            const existingFile = await File.findOne({ fileHash });
            if (existingFile) {
                results.push({ error: `Duplicate file: ${file.originalname} already exists` });
                continue; // Skip saving duplicate file
            }

            // Save new file to MongoDB
            const newFile = new File({
                fileName: file.originalname,
                fileHash: fileHash,
                fileData: file.buffer
            });

            await newFile.save();
            results.push({ success: `File uploaded: ${file.originalname}` });
        } catch (err) {
            console.error('Error uploading file:', err);
            results.push({ error: `Error uploading file: ${file.originalname}` });
        }
    }

    // Send response with upload results
    res.json(results);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

