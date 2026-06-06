import { render, screen } from '@testing-library/react';
import DashboardLayout from '../src/app/(dashboard)/layout';

// Mock Sidebar and Header using relative paths to avoid router / store requirements
jest.mock('../src/components/shared/Sidebar', () => ({
  Sidebar: () => <div>Sidebar</div>,
}));
jest.mock('../src/components/shared/Header', () => ({
  Header: () => <div>Header</div>,
}));

describe('Dashboard Layout', () => {
  it('renders sidebar and header', () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
