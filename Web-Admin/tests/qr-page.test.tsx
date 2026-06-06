import { render, screen } from '@testing-library/react';
import QRPage from '../src/app/(dashboard)/qr/page';

class MockEventSource {
  onmessage: any;
  close: any;
  constructor() {
    this.onmessage = null;
    this.close = jest.fn();
  }
}
Object.defineProperty(window, 'EventSource', {
  value: MockEventSource,
});

describe('QR Management Page', () => {
  it('renders QR status', () => {
    render(<QRPage />);
    expect(screen.getByText('QR Management')).toBeInTheDocument();
  });
});
