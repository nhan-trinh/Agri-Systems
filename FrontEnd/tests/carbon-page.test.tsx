import { render, screen } from '@testing-library/react';
import CarbonPage from '../src/app/(dashboard)/carbon/page';

describe('Carbon Page', () => {
  it('renders records table', () => {
    render(<CarbonPage />);
    expect(screen.getByText('Carbon Records')).toBeInTheDocument();
  });
});
