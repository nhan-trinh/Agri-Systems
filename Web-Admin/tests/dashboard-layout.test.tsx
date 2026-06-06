import { render, screen } from '@testing-library/react';
import DashboardLayout from '../src/app/(dashboard)/layout';

describe('Dashboard Layout', () => {
  it('renders sidebar and header', () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
