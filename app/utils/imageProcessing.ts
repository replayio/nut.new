/**
 * Image processing utilities for resizing, format conversion, and validation
 */

export interface ProcessedImage {
  file: File;
  dataURL: string;
  wasProcessed: boolean;
  originalSize: number;
  processedSize: number;
  originalType: string;
  processedType: string;
}

export interface ImageProcessingOptions {
  maxSizeKB?: number; // Maximum file size in KB (default: 500KB)
  maxWidth?: number; // Maximum width in pixels (default: 1920)
  maxHeight?: number; // Maximum height in pixels (default: 1080)
  quality?: number; // JPEG quality 0-1 (default: 0.8)
  targetFormat?: 'jpeg' | 'png' | 'webp'; // Target format (default: 'jpeg')
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxSizeKB: 500,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  targetFormat: 'jpeg',
};

const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const CONVERTIBLE_TYPES = ['image/svg+xml', 'image/bmp', 'image/tiff'];

/**
 * Check if a file type is supported by Anthropic
 */
export function isSupportedImageType(type: string): boolean {
  return SUPPORTED_TYPES.includes(type.toLowerCase());
}

/**
 * Check if a file type can be converted to a supported format
 */
export function isConvertibleImageType(type: string): boolean {
  return CONVERTIBLE_TYPES.includes(type.toLowerCase());
}

/**
 * Get file size in KB
 */
export function getFileSizeKB(file: File): number {
  return Math.round(file.size / 1024);
}

/**
 * Create a canvas from an image file
 */
function createCanvasFromImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image while maintaining aspect ratio
 */
function resizeCanvas(canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number): HTMLCanvasElement {
  const { width, height } = canvas;

  // Calculate new dimensions while maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = (height * maxWidth) / width;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = (newWidth * maxHeight) / newHeight;
  }

  // If no resizing needed, return original canvas
  if (newWidth === width && newHeight === height) {
    return canvas;
  }

  // Create new canvas with resized dimensions
  const resizedCanvas = document.createElement('canvas');
  const ctx = resizedCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context for resizing');
  }

  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  return resizedCanvas;
}

/**
 * Convert canvas to blob with specified format and quality
 */
function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      format,
      quality,
    );
  });
}

/**
 * Convert blob to File with new name and type
 */
function blobToFile(blob: Blob, originalName: string, newType: string): File {
  const extension = newType.split('/')[1];
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const newName = `${nameWithoutExt}.${extension}`;

  return new File([blob], newName, {
    type: newType,
    lastModified: Date.now(),
  });
}

/**
 * Convert blob to data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Process an image file: resize, convert format, and optimize
 */
export async function processImage(file: File, options: ImageProcessingOptions = {}): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSizeKB = getFileSizeKB(file);

  // Check if file is already small enough and in correct format
  if (
    originalSizeKB <= opts.maxSizeKB &&
    isSupportedImageType(file.type) &&
    (opts.targetFormat === 'jpeg'
      ? file.type === 'image/jpeg'
      : opts.targetFormat === 'png'
        ? file.type === 'image/png'
        : opts.targetFormat === 'webp'
          ? file.type === 'image/webp'
          : true)
  ) {
    const dataURL = await blobToDataURL(file);
    return {
      file,
      dataURL,
      wasProcessed: false,
      originalSize: originalSizeKB,
      processedSize: originalSizeKB,
      originalType: file.type,
      processedType: file.type,
    };
  }

  try {
    // Create canvas from image
    const canvas = await createCanvasFromImage(file);

    // Resize if needed
    const resizedCanvas = resizeCanvas(canvas, opts.maxWidth, opts.maxHeight);

    // Determine output format
    const outputFormat = `image/${opts.targetFormat}`;

    // Convert to blob with quality optimization
    let quality = opts.quality;
    let processedBlob: Blob;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      processedBlob = await canvasToBlob(resizedCanvas, outputFormat, quality);
      attempts++;

      // If still too large, reduce quality
      if (processedBlob.size > opts.maxSizeKB * 1024 && attempts < maxAttempts) {
        quality = Math.max(0.1, quality - 0.15);
      }
    } while (processedBlob.size > opts.maxSizeKB * 1024 && attempts < maxAttempts);

    // Create new file
    const processedFile = blobToFile(processedBlob, file.name, outputFormat);
    const dataURL = await blobToDataURL(processedBlob);
    const processedSizeKB = getFileSizeKB(processedFile);

    return {
      file: processedFile,
      dataURL,
      wasProcessed: true,
      originalSize: originalSizeKB,
      processedSize: processedSizeKB,
      originalType: file.type,
      processedType: outputFormat,
    };
  } catch (error) {
    console.error('Image processing failed:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
  canConvert?: boolean;
} {
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'File is not an image',
    };
  }

  // Check if supported
  if (isSupportedImageType(file.type)) {
    return { isValid: true };
  }

  // Check if convertible
  if (isConvertibleImageType(file.type)) {
    return {
      isValid: true,
      canConvert: true,
    };
  }

  return {
    isValid: false,
    error: `Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP`,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(sizeKB: number): string {
  if (sizeKB < 1024) {
    return `${sizeKB} KB`;
  }
  return `${(sizeKB / 1024).toFixed(1)} MB`;
}
