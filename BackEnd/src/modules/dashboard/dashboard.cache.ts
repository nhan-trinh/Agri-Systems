import { getRedisClient } from '../../shared/utils/redis.client';

export class DashboardCache {
  /**
   * Retrieves data from Redis cache.
   * @param key Redis cache key
   */
  public async getCachedDashboardData(key: string): Promise<any | null> {
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err: any) {
      console.error('[Redis Error] Failed to get dashboard cache:', err.message);
      return null;
    }
  }

  /**
   * Saves data into Redis cache with a 15-minute TTL.
   * @param key Redis cache key
   * @param data Data object to serialize and save
   */
  public async setCachedDashboardData(key: string, data: any): Promise<void> {
    try {
      const redis = await getRedisClient();
      // Cache-Aside Pattern: 15 minutes TTL (900 seconds)
      await redis.set(key, JSON.stringify(data), { EX: 900 });
    } catch (err: any) {
      console.error('[Redis Error] Failed to set dashboard cache:', err.message);
    }
  }

  /**
   * Invalidate dashboard cache for a specific cooperative,
   * plus the global/all aggregate views.
   * @param cooperativeId Cooperative UUID
   */
  public async invalidateCooperativeCache(cooperativeId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const keysToDelete: string[] = [];

      // Scan keys matching dashboard:*:cooperativeId*
      for await (const key of redis.scanIterator({
        MATCH: `dashboard:*:${cooperativeId}*`,
        COUNT: 100,
      })) {
        keysToDelete.push(key);
      }

      // Scan keys matching dashboard:*:all*
      for await (const key of redis.scanIterator({
        MATCH: 'dashboard:*:all*',
        COUNT: 100,
      })) {
        keysToDelete.push(key);
      }

      if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
      }
    } catch (err: any) {
      console.error('[Redis Error] Failed to invalidate cooperative dashboard cache:', err.message);
    }
  }
}

export const dashboardCache = new DashboardCache();
export default dashboardCache;
