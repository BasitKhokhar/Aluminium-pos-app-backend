const axios = require('axios');
const FormData = require('form-data');

const {
    BUCKET_BASE_URL,
    BUCKET_CLIENT_ID,
    BUCKET_CLIENT_SECRET,
    BUCKET_ID,
} = process.env;

let cachedToken = null;
let tokenExpiry = 0;

async function getAuthToken() {
    if (cachedToken && tokenExpiry > Date.now()) {
        console.log(" Using cached token");
        return cachedToken;
    }

    console.log("🔄 Fetching new token from bucket");

    try {
        const response = await axios({
            method: 'POST',
            url: `${BUCKET_BASE_URL}/auth/token`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            data: {
                client_id: BUCKET_CLIENT_ID,
                client_secret: BUCKET_CLIENT_SECRET,
            },
            timeout: 30000,
        });

        console.log(" Token response status:", response.status);

        if (!response.data?.success || !response.data?.result?.token) {
            throw new Error("Invalid bucket auth response");
        }

        cachedToken = response.data.result.token;

        // Set expiry (1 hour default since expires_at is null)
        tokenExpiry = Date.now() + 60 * 60 * 1000;

        console.log(" Token cached successfully");
        return cachedToken;

    } catch (error) {
        console.error("❌ Auth token error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        throw error;
    }
}

async function uploadImageFromUrl(imageUrl, customFilename = null, retryCount = 0) {
    const MAX_RETRIES = 3;

    try {
        console.log(" Downloading image from URL...");

        // 1. Download image
        const imgResponse = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
            timeout: 30000,
        });

        const buffer = Buffer.from(imgResponse.data);
        const contentType = imgResponse.headers['content-type'] || 'image/jpeg';

        console.log(" Image downloaded, size:", buffer.length, "bytes");

        // 2. Get token
        const token = await getAuthToken();

        // 3. Filename
        const filename = customFilename || `AIgenerated/${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.jpg`;

        console.log(" Uploading to bucket...");

        // 4. Upload to bucket
        const formData = new FormData();
        formData.append('file', buffer, {
            filename,
            contentType,
        });
        formData.append('bucket_id', BUCKET_ID);

        const uploadResponse = await axios({
            method: 'POST',
            url: `${BUCKET_BASE_URL}/files`,
            data: formData,
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
        });

        // console.log(" Upload response status:", uploadResponse.status);

        if (!uploadResponse.data?.success || !uploadResponse.data?.result?.access_url) {
            throw new Error('Bucket upload response missing access_url');
        }

        console.log("Upload successful:", uploadResponse.data.result.access_url);
        return uploadResponse.data.result.access_url;

    } catch (error) {
        // Handle 401 - token expired
        if (error.response?.status === 401 && retryCount < 1) {
            console.log("🔄 Token expired, clearing cache and retrying...");
            clearBucketToken();
            return uploadImageFromUrl(imageUrl, customFilename, retryCount + 1);
        }

        // Retry on network errors
        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.message.includes('timeout');

        if (isNetworkError && retryCount < MAX_RETRIES) {
            const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(` Network error (${error.code}), retrying in ${waitTime / 1000}s (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return uploadImageFromUrl(imageUrl, customFilename, retryCount + 1);
        }

        console.error(" Upload error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        throw error;
    }
}

async function uploadImageFromBuffer(
    buffer,
    contentType,
    customFilename = null,
    retryCount = 0
) {
    const MAX_RETRIES = 3;

    try {
        console.log(" Uploading buffer to bucket, size:", buffer.length, "bytes");

        const token = await getAuthToken();

        const filename =
            customFilename ||
            `original-images/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}.jpg`;

        const formData = new FormData();
        formData.append("file", buffer, {
            filename,
            contentType,
        });
        formData.append("bucket_id", BUCKET_ID);

        const uploadResponse = await axios({
            method: 'POST',
            url: `${BUCKET_BASE_URL}/files`,
            data: formData,
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
        });

        // console.log("Upload response status:", uploadResponse.status);

        if (!uploadResponse.data?.success || !uploadResponse.data?.result?.access_url) {
            throw new Error("Bucket upload response missing access_url");
        }

        console.log("Upload successful:", uploadResponse.data.result.access_url);
        return uploadResponse.data.result.access_url;

    } catch (error) {
        if (error.response?.status === 401 && retryCount < 1) {
            console.log(" Token expired, clearing cache and retrying...");
            clearBucketToken();
            return uploadImageFromBuffer(buffer, contentType, customFilename, retryCount + 1);
        }

        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.message.includes('timeout');

        if (isNetworkError && retryCount < MAX_RETRIES) {
            const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(`Network error (${error.code}), retrying in ${waitTime / 1000}s (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return uploadImageFromBuffer(buffer, contentType, customFilename, retryCount + 1);
        }

        console.error(" Upload error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        throw error;
    }
}

module.exports = {
    uploadImageFromUrl,
    uploadImageFromBuffer
};