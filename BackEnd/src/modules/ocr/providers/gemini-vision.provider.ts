import { GoogleGenerativeAI } from '@google/generative-ai';
import { OcrProvider, RawOcrResult } from './ocr-provider.interface';

export class GeminiVisionProvider implements OcrProvider {
  readonly name = 'gemini-vision';
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async extract(buffer: Buffer, mimeType: string): Promise<RawOcrResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType,
      },
    };

    const prompt = 'Hãy trích xuất toàn bộ văn bản thô có trong bức ảnh này, giữ nguyên dòng và định dạng văn bản nhiều nhất có thể.';

    const response = await model.generateContent([imagePart, prompt]);
    const text = response.response.text() || '';

    return {
      text,
      blocks: [],
      confidence: 0.95,
    };
  }
}
