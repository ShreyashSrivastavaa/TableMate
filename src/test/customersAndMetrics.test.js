import { describe, it, expect, beforeEach } from 'vitest';
import { repository } from '../services/reservationRepository';
import { RESERVATION_STATUS } from '../domain/constants';

describe('Derived Data: Customers & Dashboard Metrics', () => {
  beforeEach(() => {
    localStorage.clear();
    repository.reset();
  });

  it('de-duplicates customers by normalized phone number', () => {
    const customers = repository.getCustomers();
    expect(customers.length).toBeGreaterThan(0);

    // Verify all phones are unique in customer list
    const phones = customers.map((c) => c.phone);
    const uniquePhones = new Set(phones);
    expect(phones.length).toBe(uniquePhones.size);

    // Verify reservation count is >= 1
    customers.forEach((c) => {
      expect(c.reservationCount).toBeGreaterThanOrEqual(1);
      expect(c.name).toBeTruthy();
    });
  });

  it('computes derived dashboard metrics dynamically', () => {
    const metrics = repository.getDashboardMetrics();
    expect(metrics).toHaveProperty('today');
    expect(metrics).toHaveProperty('totalToday');
    expect(metrics).toHaveProperty('pendingToday');
    expect(metrics).toHaveProperty('confirmedToday');
    expect(metrics).toHaveProperty('cancelledToday');
    expect(metrics).toHaveProperty('upcomingToday');
    expect(metrics).toHaveProperty('recentActivity');

    expect(metrics.totalToday).toBe(
      metrics.pendingToday + metrics.confirmedToday + metrics.cancelledToday
    );
    expect(Array.isArray(metrics.upcomingToday)).toBe(true);
    expect(Array.isArray(metrics.recentActivity)).toBe(true);
  });
});
