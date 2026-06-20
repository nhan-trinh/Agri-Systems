import { GeminiVisionProvider } from './gemini-vision.provider';

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    text: () => 'Extracted text via Gemini'
  }
});

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      };
    })
  };
});

describe('GeminiVisionProvider', () => {
  it('extracts text successfully using Gemini API', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const provider = new GeminiVisionProvider();
    const result = await provider.extract(Buffer.from('dummy'), 'image/jpeg');
    expect(result.text).toBe('Extracted text via Gemini');
    expect(provider.name).toBe('gemini-vision');
  });
});
