import { OcrProvider, AiNormalizer } from './ocr-provider.interface';
import { StubOcrProvider } from './stub-ocr.provider';
import { StubAiNormalizer } from './stub-ai.normalizer';
import { GoogleVisionProvider } from './google-vision.provider';
import { GeminiNormalizer } from './gemini.normalizer';
import config from '../../../config/app.config';

/**
 * Provider factory — returns the configured OCR/AI provider pair.
 *
 * Selected by `config.ocr.provider`:
 * - 'stub'   → StubOcrProvider + StubAiNormalizer (default, no external calls)
 * - 'google' → GoogleVisionProvider + GeminiNormalizer
 */
export function getOcrProvider(): OcrProvider {
  switch (config.ocr.provider) {
    case 'google':
      return new GoogleVisionProvider();
    case 'stub':
    default:
      return new StubOcrProvider();
  }
}

export function getAiNormalizer(): AiNormalizer {
  switch (config.ocr.provider) {
    case 'google':
      return new GeminiNormalizer();
    case 'stub':
    default:
      return new StubAiNormalizer();
  }
}
