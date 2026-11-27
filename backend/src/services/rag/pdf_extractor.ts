import path from 'path';

const MAX_PDF_BYTES = 1400 * 1024;
const MAX_PDF_PAGES = 50;
const MAX_EXTRACTED_CHARS = 500_000;

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

type UnpdfModule = {
  extractText: (
    data: Uint8Array,
    options?: { mergePages?: boolean }
  ) => Promise<{ totalPages: number; text: string | string[] }>;
};

let cachedUnpdf: UnpdfModule | null = null;

async function loadUnpdf(): Promise<UnpdfModule> {
  if (cachedUnpdf) return cachedUnpdf;

  const bridgePath = path.join(__dirname, 'unpdf_import.cjs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bridge = require(bridgePath) as { loadUnpdfModule: () => Promise<UnpdfModule> };
  const mod = await bridge.loadUnpdfModule();
  if (mod && typeof mod.extractText === 'function') {
    cachedUnpdf = mod;
    return mod;
  }

  throw new PdfExtractionError('PDF extraction module could not be loaded.');
}

/**
 * Extracts bounded plain text from a base64-encoded PDF buffer using `unpdf`.
 * Rejects oversized, invalid-header, encrypted, or empty PDFs cleanly.
 */
export async function extractTextFromPdfBase64(base64Input: string): Promise<{
  text: string;
  pageCount: number;
  byteLength: number;
}> {
  const cleaned = base64Input.replace(/^data:application\/pdf;base64,/i, '').trim();
  if (!cleaned) {
    throw new PdfExtractionError('PDF payload is empty.');
  }

  // Validate base64 alphabet strictly before allocating Buffer
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(cleaned)) {
    throw new PdfExtractionError('Invalid base64 encoding for PDF file.');
  }

  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_PDF_BYTES) {
    throw new PdfExtractionError('PDF exceeds maximum allowed 2 MB decoded size.');
  }

  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new PdfExtractionError('Uploaded file does not have a valid %PDF- header.');
  }

  let extracted: { totalPages: number; text: string | string[] };
  try {
    const unpdf = await loadUnpdf();
    extracted = await unpdf.extractText(new Uint8Array(buffer), { mergePages: true });
  } catch (err) {
    const rawMsg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err || 'Unable to parse PDF');
    if (/password|encrypt/i.test(rawMsg)) {
      throw new PdfExtractionError('Password-protected or encrypted PDFs cannot be ingested.');
    }
    throw new PdfExtractionError(`Failed to extract text from PDF: ${rawMsg}`);
  }

  const pageCount = Number(extracted.totalPages || 0);
  if (pageCount > MAX_PDF_PAGES) {
    throw new PdfExtractionError(`PDF exceeds the ${MAX_PDF_PAGES}-page ingestion limit (${pageCount} pages found).`);
  }

  const rawText = Array.isArray(extracted.text) ? extracted.text.join('\n\n') : String(extracted.text || '');
  const normalized = rawText.replace(/\u0000/g, '').trim();
  if (!normalized) {
    throw new PdfExtractionError('No extractable text found in PDF (scanned image-only PDFs are not supported without OCR).');
  }

  return {
    text: normalized.slice(0, MAX_EXTRACTED_CHARS),
    pageCount,
    byteLength: buffer.byteLength
  };
}
