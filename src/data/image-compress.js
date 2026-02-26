/**
 * ShiftV Data Compression & Image Utilities
 * 
 * - Image compression using browser-image-compression
 * - JSON compression using pako (gzip) for measurements
 */

/**
 * Compress an image file for upload.
 * Resizes to max 800px and converts to WebP with quality 0.75.
 * 
 * @param {File} file - Original image file
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file) {
    const imageCompression = (await import('browser-image-compression')).default;
    
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.75
    };
    
    try {
        const compressedFile = await imageCompression(file, options);
        console.log(`[ImageCompress] ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
        return compressedFile;
    } catch (error) {
        console.error('[ImageCompress] Compression failed:', error);
        // Fall back to original file
        return file;
    }
}

/**
 * Compress a measurement JSON object using gzip (pako) + base64.
 * Use for large measurement records before Firestore upload.
 * 
 * @param {Object} obj - Measurement data object
 * @returns {string} Base64-encoded gzipped string
 */
export async function compressMeasurementJSON(obj) {
    try {
        const pako = (await import('pako')).default || (await import('pako'));
        const jsonStr = JSON.stringify(obj);
        const compressed = pako.gzip(jsonStr);
        
        // Convert Uint8Array to base64
        let binary = '';
        const bytes = new Uint8Array(compressed);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch (error) {
        console.error('[Compress] gzip compression failed:', error);
        // Return as plain JSON string fallback
        return JSON.stringify(obj);
    }
}

/**
 * Decompress a base64-encoded gzipped measurement string.
 * 
 * @param {string} str - Base64-encoded gzipped string
 * @returns {Object} Decompressed measurement object
 */
export async function decompressMeasurementJSON(str) {
    try {
        // Try to parse as plain JSON first
        if (str.startsWith('{') || str.startsWith('[')) {
            return JSON.parse(str);
        }
        
        const pako = (await import('pako')).default || (await import('pako'));
        // Decode base64 to Uint8Array
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const decompressed = pako.ungzip(bytes, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('[Decompress] gzip decompression failed:', error);
        // Try plain JSON parse as fallback
        try {
            return JSON.parse(str);
        } catch {
            throw new Error('Failed to decompress measurement data');
        }
    }
}
