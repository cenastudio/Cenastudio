import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClientIdFromQuery } from './useClientIdFromQuery';

// Mock wouter's useSearch to control the URL query string in tests
vi.mock('wouter', () => ({
  useSearch: vi.fn(),
}));

import { useSearch } from 'wouter';

const mockUseSearch = vi.mocked(useSearch);

describe('useClientIdFromQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('returns null for invalid inputs', () => {
    it('returns null when clientId param is missing', () => {
      mockUseSearch.mockReturnValue('');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null when query string has no clientId key', () => {
      mockUseSearch.mockReturnValue('?foo=bar&baz=1');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null for a non-numeric string (e.g. "abc")', () => {
      mockUseSearch.mockReturnValue('?clientId=abc');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null for a negative integer (e.g. "-5")', () => {
      mockUseSearch.mockReturnValue('?clientId=-5');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null for a float string (e.g. "1.5")', () => {
      mockUseSearch.mockReturnValue('?clientId=1.5');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null for zero ("0")', () => {
      mockUseSearch.mockReturnValue('?clientId=0');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });

    it('returns null for an empty string value', () => {
      mockUseSearch.mockReturnValue('?clientId=');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBeNull();
    });
  });

  describe('returns the integer value for valid positive integer strings', () => {
    it('returns 1 for "1"', () => {
      mockUseSearch.mockReturnValue('?clientId=1');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBe(1);
    });

    it('returns 999 for "999"', () => {
      mockUseSearch.mockReturnValue('?clientId=999');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBe(999);
    });

    it('returns 42 for "42"', () => {
      mockUseSearch.mockReturnValue('?clientId=42');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBe(42);
    });

    it('returns the correct number even when other params are present', () => {
      mockUseSearch.mockReturnValue('?foo=bar&clientId=7&baz=qux');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(result.current).toBe(7);
    });

    it('returns the number type (not a string)', () => {
      mockUseSearch.mockReturnValue('?clientId=123');
      const { result } = renderHook(() => useClientIdFromQuery());
      expect(typeof result.current).toBe('number');
      expect(result.current).toBe(123);
    });
  });
});
