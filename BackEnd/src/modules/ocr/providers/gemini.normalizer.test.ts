import { GeminiNormalizer } from './gemini.normalizer';

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    text: () => JSON.stringify([
      {
        target_entity: 'FARMING_LOG',
        document_type: 'FARMING_LOGBOOK',
        ai_normalized_data: {
          notes: 'Test notes',
          activity_date: '2026-06-20',
          activity_type: 'FERTILIZING'
        },
        confidence_score: 0.9
      }
    ])
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

describe('GeminiNormalizer', () => {
  it('normalizes raw OCR text into structured JSON drafts', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const normalizer = new GeminiNormalizer();
    const result = await normalizer.normalize('Raw OCR Text', 'FARMING_LOGBOOK', {
      cooperativeId: 'coop-1',
      materialNames: ['Phân Urê'],
      seasons: [{ id: 'season-1', name: 'Vụ lúa 1', zoneName: 'Khu A' }]
    });

    expect(result[0].target_entity).toBe('FARMING_LOG');
    expect(result[0].confidence_score).toBe(0.9);
  });
});
