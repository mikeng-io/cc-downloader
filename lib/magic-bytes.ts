/**
 * Magic bytes (file signature) detection utility
 * Used as a fallback to detect file types when Content-Type and URL extension are unavailable
 *
 * Magic bytes are the first few bytes of a file that identify its format
 */

/**
 * Magic byte signatures mapped to file extensions
 * Each signature is an array of byte values (0-255)
 */
export const MAGIC_BYTES_SIGNATURES: Record<string, { extension: string; signature: number[]; offset: number }> = {
  // Images
  'jpeg': {
    extension: '.jpg',
    signature: [0xFF, 0xD8, 0xFF],
    offset: 0,
  },
  'png': {
    extension: '.png',
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    offset: 0,
  },
  'gif': {
    extension: '.gif',
    signature: [0x47, 0x49, 0x46, 0x38], // 'GIF8'
    offset: 0,
  },
  'webp': {
    extension: '.webp',
    signature: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
    offset: 0,
  },
  'bmp': {
    extension: '.bmp',
    signature: [0x42, 0x4D], // 'BM'
    offset: 0,
  },
  'tiff': {
    extension: '.tiff',
    signature: [0x49, 0x49, 0x2A, 0x00], // little-endian TIFF
    offset: 0,
  },
  'tiff_be': {
    extension: '.tiff',
    signature: [0x4D, 0x4D, 0x00, 0x2A], // big-endian TIFF
    offset: 0,
  },
  'ico': {
    extension: '.ico',
    signature: [0x00, 0x00, 0x01, 0x00],
    offset: 0,
  },

  // Videos
  'mp4': {
    extension: '.mp4',
    signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp marker
    offset: 4,
  },
  'webm': {
    extension: '.webm',
    signature: [0x1A, 0x45, 0xDF, 0xA3], // EBML header
    offset: 0,
  },
  'avi': {
    extension: '.avi',
    signature: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
    offset: 0,
  },
  'mov': {
    extension: '.mov',
    signature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // ftyp with mov variant
    offset: 4,
  },

  // Audio
  'mp3': {
    extension: '.mp3',
    signature: [0xFF, 0xFB], // MPEG sync
    offset: 0,
  },
  'mp3_alt': {
    extension: '.mp3',
    signature: [0xFF, 0xFA], // MPEG sync alt
    offset: 0,
  },
  'mp3_id3': {
    extension: '.mp3',
    signature: [0x49, 0x44, 0x33], // 'ID3'
    offset: 0,
  },
  'wav': {
    extension: '.wav',
    signature: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
    offset: 0,
  },
  'ogg': {
    extension: '.ogg',
    signature: [0x4F, 0x67, 0x67, 0x53], // 'OggS'
    offset: 0,
  },
  'flac': {
    extension: '.flac',
    signature: [0x66, 0x4C, 0x61, 0x43], // 'fLaC'
    offset: 0,
  },

  // Documents
  'pdf': {
    extension: '.pdf',
    signature: [0x25, 0x50, 0x44, 0x46], // '%PDF'
    offset: 0,
  },

  // Archives
  'zip': {
    extension: '.zip',
    signature: [0x50, 0x4B, 0x03, 0x04], // 'PK'
    offset: 0,
  },
  'rar': {
    extension: '.rar',
    signature: [0x52, 0x61, 0x72, 0x21], // 'Rar!'
    offset: 0,
  },
  '7z': {
    extension: '.7z',
    signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C],
    offset: 0,
  },
  'gz': {
    extension: '.gz',
    signature: [0x1F, 0x8B],
    offset: 0,
  },
};

/**
 * Detect file extension from magic bytes (file signature)
 * @param buffer - Buffer containing the first bytes of the file
 * @returns The file extension including the dot (e.g., ".jpg") or null if not detected
 */
export function detectExtensionFromMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  for (const [name, { signature, offset, extension }] of Object.entries(MAGIC_BYTES_SIGNATURES)) {
    // Check if buffer is large enough for the signature at the given offset
    if (buffer.length < offset + signature.length) continue;

    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return extension;
    }
  }

  return null;
}

/**
 * Read first bytes of a file for magic bytes detection
 * @param filePath - Path to the file
 * @param bytesToRead - Number of bytes to read (default: 32, enough for all signatures)
 * @returns Buffer containing the file's first bytes
 */
export async function readFileMagicBytes(
  filePath: string,
  bytesToRead: number = 32
): Promise<Buffer> {
  const fs = await import('node:fs/promises');
  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.allocUnsafe(bytesToRead);
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * Detect file extension from file path using magic bytes
 * @param filePath - Path to the file to analyze
 * @returns The file extension including the dot, or null if detection fails
 */
export async function detectFileExtensionFromPath(filePath: string): Promise<string | null> {
  try {
    const buffer = await readFileMagicBytes(filePath);
    return detectExtensionFromMagicBytes(buffer);
  } catch (error) {
    console.error(`Failed to read magic bytes from ${filePath}:`, error);
    return null;
  }
}
