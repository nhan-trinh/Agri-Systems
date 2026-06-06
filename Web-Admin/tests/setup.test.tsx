import { render, screen } from '@testing-library/react';
import Home from '../src/app/page';

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByText('AgriTrace Carbon')).toBeInTheDocument();
  });
});
