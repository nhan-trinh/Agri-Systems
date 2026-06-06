import { render, screen } from '@testing-library/react';
import DashboardPage from '../src/app/(dashboard)/page';

// Mock Leaflet and Recharts
jest.mock('../src/components/charts/CarbonTrendChart', () => ({
  CarbonTrendChart: () => <div>Carbon Chart</div>
}));
jest.mock('../src/components/map/FarmZoneMap', () => ({
  FarmZoneMap: () => <div>Farm Map</div>
}));

describe('Dashboard Page', () => {
  it('renders KPIs, Chart, and Map', async () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Carbon Chart')).toBeInTheDocument();
    expect(await screen.findByText('Farm Map')).toBeInTheDocument();
  });
});
