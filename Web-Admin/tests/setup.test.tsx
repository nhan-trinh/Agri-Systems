import { render, screen } from '@testing-library/react';
import LoginPage from '../src/app/login/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Login Page', () => {
  it('renders without crashing', () => {
    render(<LoginPage />);
    expect(screen.getByText('AgriTrace Carbon')).toBeInTheDocument();
  });
});
