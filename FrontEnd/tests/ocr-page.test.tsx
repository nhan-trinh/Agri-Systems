import { render, screen } from '@testing-library/react';
import OCRPage from '../src/app/(dashboard)/ocr/page';

describe('OCR Page', () => {
  it('renders capture options', () => {
    render(<OCRPage />);
    expect(screen.getByText('Digitize Records (OCR)')).toBeInTheDocument();
  });
});
