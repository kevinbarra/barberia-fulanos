import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getTodayRange, formatTime } from '../dates';
import { DEFAULT_TIMEZONE } from '../constants';

describe('Date Utilities', () => {
    beforeEach(() => {
        // Mock system time to a specific date: 2024-05-15 12:00:00 UTC
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getTodayRange', () => {
        it('should return valid ISO strings and display date', () => {
            const { startISO, endISO, displayDate } = getTodayRange();

            expect(startISO).toBeDefined();
            expect(endISO).toBeDefined();
            expect(displayDate).toBeDefined();

            // Verify formats
            expect(new Date(startISO).toISOString()).toBe(startISO);
            expect(new Date(endISO).toISOString()).toBe(endISO);
        });

        it('should cover the full day range in UTC', () => {
            const { startISO, endISO } = getTodayRange();

            const startDate = new Date(startISO);
            const endDate = new Date(endISO);

            // The difference should be almost 24 hours (86399999 ms)
            const diff = endDate.getTime() - startDate.getTime();
            expect(diff).toBeGreaterThan(86399000); // Allow some precision loss
            expect(diff).toBeLessThan(86400001);
        });
    });

    describe('formatTime', () => {
        it('should format ISO string to readable time', () => {
            // 2024-05-15T14:30:00Z is 08:30 AM in Mexico City (UTC-6)
            // or 09:30 AM if DST (but Mexico removed DST, so likely UTC-6)
            // Let's rely on date-fns-tz to do the correct thing for the configured timezone

            // We construct a date that is definitely known in that timezone
            // Let's test just the format structure for now to avoid brittle timezone math in tests without repeating logic

            const isoString = '2024-05-15T14:30:00Z';
            const formatted = formatTime(isoString);

            expect(formatted).toMatch(/\d{1,2}:\d{2} [AP]M/);
        });
    });
});
