let worker: any = null;

export async function extractTextFromImage(
  imageFile: File,
  onProgress?: (msg: string) => void,
): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');

    onProgress?.('Loading OCR engine...');
    worker = await createWorker('eng');

    onProgress?.('Performing OCR...');
    const { data } = await worker.recognize(imageFile);

    return data.text.trim();
  } catch (err) {
    console.error('OCR error:', err);
    throw new Error('Failed to extract text from image. Please try a clearer image.');
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch {}
      worker = null;
    }
  }
}
