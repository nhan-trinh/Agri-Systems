import { render, screen } from '@testing-library/react';
import DashboardPage from '../src/app/(dashboard)/page';
import { useAuthStore } from '../src/store/auth';

// Mock Leaflet and Recharts
jest.mock('../src/components/charts/CarbonTrendChart', () => ({
  CarbonTrendChart: () => <div>Carbon Chart</div>,
}));
jest.mock('../src/components/map/FarmZoneMap', () => ({
  FarmZoneMap: () => <div>Farm Map</div>,
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    // Set authenticated user in store
    useAuthStore.setState({
      user: {
        id: '1',
        phone: '0987654321',
        role: 'HTX_MANAGER',
        cooperativeId: 'coop-1',
        farmerId: null,
        zaloId: null,
        zaloName: 'HTX Manager Test',
        avatarUrl: null,
        isFirstLogin: false,
        isActive: true,
        lastLoginAt: null,
      },
      accessToken: 'token-123',
      isInitialized: true,
    });
  });

  it('renders KPIs, Chart, and Map', async () => {
    render(<DashboardPage />);
    expect(screen.getByText('Bàn làm việc của bạn')).toBeInTheDocument();
    expect(screen.getByText('Carbon Chart')).toBeInTheDocument();
    expect(await screen.findByText('Farm Map')).toBeInTheDocument();
  });
});
