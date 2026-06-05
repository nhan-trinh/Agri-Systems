import { CreateFarmerDto } from './farmer.dto';

describe('Farmer DTO Validation', () => {
  it('should pass validation with valid Vietnamese phone and all required fields', () => {
    const validData = {
      full_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should pass validation with optional fields included', () => {
    const validData = {
      full_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123',
      national_id: '123456789',
      date_of_birth: '1990-01-01'
    };
    const result = CreateFarmerDto.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date_of_birth).toBeInstanceOf(Date);
    }
  });

  it('should fail validation if phone number does not match Vietnamese mobile format', () => {
    const invalidPhoneData = {
      full_name: 'Nguyễn Văn A',
      phone: '02838234567', // Landline prefix not allowed
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(invalidPhoneData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Số điện thoại không hợp lệ');
    }
  });

  it('should fail validation if required fields are missing', () => {
    const missingFields = {
      phone: '0987654321',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(missingFields);
    expect(result.success).toBe(false);
  });
});
