import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OcrProvider, RawOcrResult } from './ocr-provider.interface';

export class GoogleVisionProvider implements OcrProvider {
  readonly name = 'google-vision';
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  async extract(buffer: Buffer, mimeType: string): Promise<RawOcrResult> {
    const [result] = await this.client.textDetection({
      image: { content: buffer },
    });
    const text = result.fullTextAnnotation?.text || '';
    const blocks = result.textAnnotations?.map((ann: any) => ({
      text: ann.description,
      boundingPoly: ann.boundingPoly,
    })) || [];

    return {
      text,
      blocks,
      confidence: 0.95,
    };
  }
}
