import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API
});

/**
 * Generate a unique NFT image using OpenAI DALL-E
 * @param {Object} invoiceData - Invoice information to make image unique
 * @param {string} invoiceData.invoiceNumber - Invoice number
 * @param {number} invoiceData.faceValue - Invoice face value
 * @param {string} invoiceData.maturityDate - Maturity date
 * @returns {Promise<string>} - URL of the generated image
 */
export async function generateUniqueInvoiceImage(invoiceData) {
  try {
    // Create a unique prompt by incorporating invoice details
    // This ensures each image is different
    const uniqueElements = [
      `color palette ${getColorPalette(invoiceData.invoiceNumber)}`,
      `geometric pattern ${getGeometricPattern(invoiceData.faceValue)}`,
      `gradient style ${getGradientStyle(invoiceData.maturityDate)}`
    ];

    const basePrompt = `Minimal, professional financial NFT artwork.
Abstract invoice document, clean fintech style,
dark background, subtle gradients, no text.
Unique styling: ${uniqueElements.join(', ')}.
Modern, elegant, minimalist design with ${getAccentColor(invoiceData.invoiceNumber)} accents.`;

    console.log('Generating image with prompt:', basePrompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: basePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated from OpenAI');
    }

    const imageUrl = response.data[0].url;
    console.log('Image generated successfully:', imageUrl);

    return imageUrl;
  } catch (error) {
    console.error('OpenAI image generation error:', error);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

/**
 * Get a unique color palette based on invoice number
 * @param {string} invoiceNumber
 * @returns {string}
 */
function getColorPalette(invoiceNumber) {
  const palettes = [
    'deep blue and purple',
    'teal and cyan',
    'indigo and violet',
    'emerald and jade',
    'sapphire and navy',
    'royal blue and gold',
    'charcoal and silver',
    'midnight blue and aqua'
  ];

  const hash = invoiceNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

/**
 * Get a unique geometric pattern based on face value
 * @param {number} faceValue
 * @returns {string}
 */
function getGeometricPattern(faceValue) {
  const patterns = [
    'hexagonal grid',
    'triangular mesh',
    'circular waves',
    'diagonal lines',
    'concentric circles',
    'abstract polygons',
    'flowing curves',
    'crystalline structures'
  ];

  const index = Math.floor(faceValue) % patterns.length;
  return patterns[index];
}

/**
 * Get a unique gradient style based on maturity date
 * @param {string} maturityDate
 * @returns {string}
 */
function getGradientStyle(maturityDate) {
  const styles = [
    'radial from center',
    'linear diagonal',
    'vertical smooth',
    'horizontal blend',
    'spiral from corner',
    'angular sweep',
    'soft vignette',
    'layered depth'
  ];

  const dateValue = new Date(maturityDate).getTime();
  return styles[Math.floor(dateValue / 1000000) % styles.length];
}

/**
 * Get an accent color based on invoice number
 * @param {string} invoiceNumber
 * @returns {string}
 */
function getAccentColor(invoiceNumber) {
  const colors = [
    'electric blue',
    'neon purple',
    'bright cyan',
    'vivid magenta',
    'luminous teal',
    'radiant violet',
    'glowing indigo',
    'brilliant azure'
  ];

  const hash = invoiceNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
