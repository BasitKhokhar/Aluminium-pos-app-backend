const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BUCKET_PATH = process.env.BUCKET_PATH;
const BUCKET_BASE_URL = process.env.BUCKET_BASE_URL;

const uploadImageFromBuffer = async (buffer, mimetype, filename) => {
    try {

        // Ensure bucket folder exists
        if (!fs.existsSync(BUCKET_PATH)) {
            fs.mkdirSync(BUCKET_PATH, { recursive: true });
        }

        const filePath = path.join(BUCKET_PATH, filename);

        // Save file
        await fs.promises.writeFile(filePath, buffer);

        // Return public URL
        const fileUrl = `${BUCKET_BASE_URL}/${filename}`;

        return fileUrl;

    } catch (error) {
        console.error("Bucket Upload Error:", error);
        throw error;
    }
};

module.exports = {
    uploadImageFromBuffer
};