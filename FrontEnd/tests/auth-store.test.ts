import { useAuthStore } from '../src/store/auth';

describe('Auth Store', () => {
  it('initializes with null user', () => {
    const { user } = useAuthStore.getState();
    expect(user).toBeNull();
  });
});
