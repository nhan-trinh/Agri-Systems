import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CarbonPage from '../src/app/(dashboard)/carbon/page';
import { apiClient } from '../src/lib/api/axios';
import { useAuthStore } from '../src/store/auth';

// Mock dependencies
jest.mock('../src/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:3000/api/v1',
    },
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockRecords = [
  {
    id: 'record-1',
    season_id: 'season-1',
    total_emitted_kg: 5000,
    total_sequestered_kg: 8000,
    net_carbon_tCO2e: -3.00,
    status: 'ISSUED',
    verified_by: 'admin-1',
    verified_at: '2026-06-13T00:00:00Z',
    issued_at: '2026-06-13T01:00:00Z',
    certificate_no: 'CARBON-2026-ABCD1234',
    credit_amount_tCO2e: 3.00,
    created_at: '2026-06-12T00:00:00Z',
    season: {
      season_name: 'Vụ mùa Đông Xuân 2026',
      crop_variety: 'Giống Lúa ST25',
      actual_yield_kg: 40000,
      farm_zone: {
        zone_name: 'Vùng đệm A1',
        farm_zone_code: 'ZONE-A1',
        farmer: {
          full_name: 'Nguyễn Văn Ruộng',
          cooperative: {
            name: 'HTX Nông Nghiệp Xanh',
          },
        },
      },
    },
    calculation_details: {
      factor_version: 'IPCC 2006 v1.0',
      fertilizers: [
        {
          log_id: 'log-1',
          activity_date: '2026-03-01T00:00:00Z',
          fertilizer_type: 'Urea',
          quantity_kg: 2000,
          factor_value: 1.974,
          emissions_kgCO2e: 3948,
        },
      ],
      pesticides: [
        {
          log_id: 'log-2',
          activity_date: '2026-03-10T00:00:00Z',
          product_name: 'Thuốc trừ sâu sinh học',
          quantity_liters: 200,
          factor_value: 5.1,
          emissions_kgCO2e: 1020,
        },
      ],
      harvest: [
        {
          log_id: 'log-3',
          activity_date: '2026-05-15T00:00:00Z',
          yield_kg: 40000,
          crop_type: 'RICE',
          factor_value: 0.189,
          sequestration_kgCO2: 7560,
        },
      ],
    },
  },
];

describe('Carbon Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'admin-123',
        phone: '0987654321',
        role: 'SUPER_ADMIN',
        cooperativeId: null,
        farmerId: null,
        zaloId: null,
        zaloName: 'Super Admin Test',
        avatarUrl: null,
        isFirstLogin: false,
        isActive: true,
        lastLoginAt: null,
      },
      accessToken: 'token-123',
      isInitialized: true,
    });

    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/carbon/records')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: mockRecords,
              total: 1,
            },
          },
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });
  });

  it('renders main title and KPIs', async () => {
    render(<CarbonPage />);
    expect(screen.getByText('Báo cáo & Chứng nhận Carbon')).toBeInTheDocument();

    await waitFor(() => {
      // emitted: 5000 kg -> 5 tCO2e
      expect(screen.getByText('5')).toBeInTheDocument();
      // sequestered: 8000 kg -> 8 tCO2e
      expect(screen.getByText('8')).toBeInTheDocument();
      // credits: 3 tCO2e
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('lists carbon records in the table', async () => {
    render(<CarbonPage />);
    await waitFor(() => {
      expect(screen.getByText('Vụ mùa Đông Xuân 2026')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn Ruộng')).toBeInTheDocument();
      expect(screen.getByText('CARBON-2026-ABCD1234')).toBeInTheDocument();
      expect(screen.getByText('-3 tCO2e')).toBeInTheDocument();
      expect(screen.getByText('Đã cấp tín chỉ')).toBeInTheDocument();
    });
  });

  it('opens details modal and displays calculations breakdown', async () => {
    render(<CarbonPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Vụ mùa Đông Xuân 2026')).toBeInTheDocument();
    });

    const viewButton = screen.getByTitle('Xem chi tiết');
    fireEvent.click(viewButton);

    expect(screen.getByText('Chi tiết Tính toán Carbon')).toBeInTheDocument();
    
    // Check variety under overview tab
    expect(screen.getByText('Giống Lúa ST25')).toBeInTheDocument();

    // Click on breakdown tab
    const breakdownTab = screen.getByText('Bảng kê vật tư & Công thức');
    fireEvent.click(breakdownTab);

    // Verify emission calculation details
    expect(screen.getByText('Urea')).toBeInTheDocument();
    expect(screen.getByText('Thuốc trừ sâu sinh học')).toBeInTheDocument();
    expect(screen.getByText('RICE')).toBeInTheDocument();
  });
});
