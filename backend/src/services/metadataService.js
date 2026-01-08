/**
 * Generate NFT metadata JSON in standard format
 * @param {Object} params - Metadata parameters
 * @param {string} params.invoiceNumber - Invoice number
 * @param {number} params.faceValue - Invoice face value in USD
 * @param {string} params.maturityDate - Maturity date
 * @param {string} params.imageUrl - URL of the NFT image
 * @param {string} params.originalOwner - Public key of the establishment that issued the invoice
 * @param {string} params.creditorPublicKey - Public key of the creditor establishment
 * @returns {Object} - Metadata JSON object
 */
export function generateMetadataJSON(params) {
  const {
    invoiceNumber,
    faceValue,
    maturityDate,
    imageUrl,
    originalOwner,
    creditorPublicKey
  } = params;

  const metadata = {
    name: `Invoice #${invoiceNumber}`,
    description: `Tokenized invoice representing a receivable of $${faceValue.toLocaleString()} payable at maturity.`,
    image: imageUrl,
    attributes: [
      {
        trait_type: "Invoice Number",
        value: invoiceNumber
      },
      {
        trait_type: "Face Value",
        value: faceValue,
        unit: "USD"
      },
      {
        trait_type: "Maturity Date",
        value: maturityDate
      },
      {
        trait_type: "Asset Type",
        value: "Invoice Receivable"
      },
      {
        trait_type: "Platform",
        value: "XRPL Invoice Auction"
      },
      {
        trait_type: "Original Owner",
        value: originalOwner,
        display_type: "address"
      },
      {
        trait_type: "Current Creditor",
        value: creditorPublicKey,
        display_type: "address"
      }
    ],
    external_url: "https://your-platform-url.com", // Update with your actual platform URL
    created_at: new Date().toISOString()
  };

  return metadata;
}

/**
 * Validate metadata JSON structure
 * @param {Object} metadata - Metadata to validate
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails
 */
export function validateMetadata(metadata) {
  if (!metadata.name || typeof metadata.name !== 'string') {
    throw new Error('Metadata must have a valid name');
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    throw new Error('Metadata must have a valid description');
  }

  if (!metadata.image || typeof metadata.image !== 'string') {
    throw new Error('Metadata must have a valid image URL');
  }

  if (!Array.isArray(metadata.attributes)) {
    throw new Error('Metadata must have attributes array');
  }

  return true;
}
