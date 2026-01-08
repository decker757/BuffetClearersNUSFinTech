import { supabase } from '../config/supabase.js';
import fetch from 'node-fetch';

/**
 * Upload an image buffer to Supabase Storage
 * @param {Buffer} imageBuffer - The image data
 * @param {string} fileName - Name for the file
 * @param {string} bucketName - Supabase storage bucket name (default: 'nft-assets')
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
export async function uploadImageToStorage(imageBuffer, fileName, bucketName = 'nft-assets') {
  try {
    const filePath = `images/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false // Don't overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    throw error;
  }
}

/**
 * Upload metadata JSON to Supabase Storage
 * @param {Object} metadata - The metadata object
 * @param {string} fileName - Name for the file
 * @param {string} bucketName - Supabase storage bucket name (default: 'nft-assets')
 * @returns {Promise<string>} - Public URL of the uploaded metadata JSON
 */
export async function uploadMetadataToStorage(metadata, fileName, bucketName = 'nft-assets') {
  try {
    const filePath = `metadata/${fileName}`;
    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, metadataBuffer, {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error;
  }
}

/**
 * Download image from URL and return as buffer
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} - Image buffer
 */
export async function downloadImageAsBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Image download error:', error);
    throw error;
  }
}
