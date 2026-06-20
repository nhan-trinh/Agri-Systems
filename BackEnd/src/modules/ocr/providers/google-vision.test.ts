import { GoogleVisionProvider } from './google-vision.provider';

jest.mock('@google-cloud/vision', () => {
  return {
    ImageAnnotatorClient: jest.fn().mockImplementation(() => {
      return {
        textDetection: jest.fn().mockResolvedValue([
          {
            fullTextAnnotation: { text: 'Extracted text from Google Vision' },
            textAnnotations: [{ description: 'Extracted text from Google Vision' }]
          }
        ])
      };
    })
  };
});

describe('GoogleVisionProvider', () => {
  it('extracts text successfully using Vision API client', async () => {
    const provider = new GoogleVisionProvider();
    const result = await provider.extract(Buffer.from('dummy'), 'image/jpeg');
    expect(result.text).toBe('Extracted text from Google Vision');
    expect(provider.name).toBe('google-vision');
  });
});
