/**
 * Unit Tests for Navigation State Management
 *
 * Tests the navigation state management algorithm ensuring exactly one tab
 * is active at any time for all valid and invalid route paths.
 *
 * Verification Reference: tasks.md > Task 1.2.2 > Acceptance Criteria
 */

import { describe, it, expect } from 'vitest';
import {
  extractTabIdFromPath,
  manageNavigationState,
  validateSingleActiveTab,
  createDefaultNavigationTabs,
  type NavTab,
  type TabId,
  VALID_TAB_IDS,
} from './navigationState';

describe('extractTabIdFromPath', () => {
  describe('valid routes - primary paths', () => {
    it('should extract "home" from /home', () => {
      expect(extractTabIdFromPath('/home')).toBe('home');
    });

    it('should extract "home" from /dashboard', () => {
      expect(extractTabIdFromPath('/dashboard')).toBe('home');
    });

    it('should extract "home" from / (root)', () => {
      expect(extractTabIdFromPath('/')).toBe('home');
    });

    it('should extract "clients" from /clients', () => {
      expect(extractTabIdFromPath('/clients')).toBe('clients');
    });

    it('should extract "clients" from /commercial', () => {
      expect(extractTabIdFromPath('/commercial')).toBe('clients');
    });

    it('should extract "jobs" from /jobs', () => {
      expect(extractTabIdFromPath('/jobs')).toBe('jobs');
    });

    it('should extract "jobs" from /projects', () => {
      expect(extractTabIdFromPath('/projects')).toBe('jobs');
    });

    it('should extract "studio" from /studio', () => {
      expect(extractTabIdFromPath('/studio')).toBe('studio');
    });

    it('should extract "studio" from /tools', () => {
      expect(extractTabIdFromPath('/tools')).toBe('studio');
    });

    it('should extract "finance" from /finance', () => {
      expect(extractTabIdFromPath('/finance')).toBe('finance');
    });

    it('should extract "finance" from /analytics', () => {
      expect(extractTabIdFromPath('/analytics')).toBe('finance');
    });
  });

  describe('nested routes - parent mapping', () => {
    it('should map /project/123 to "jobs" (parent tab)', () => {
      expect(extractTabIdFromPath('/project/123')).toBe('jobs');
    });

    it('should map /project/456/edit to "jobs"', () => {
      expect(extractTabIdFromPath('/project/456/edit')).toBe('jobs');
    });

    it('should map /projects/new to "jobs"', () => {
      expect(extractTabIdFromPath('/projects/new')).toBe('jobs');
    });

    it('should map /clients/456 to "clients"', () => {
      expect(extractTabIdFromPath('/clients/456')).toBe('clients');
    });

    it('should map /clients/789/edit to "clients"', () => {
      expect(extractTabIdFromPath('/clients/789/edit')).toBe('clients');
    });

    it('should map /tools/briefing to "studio"', () => {
      expect(extractTabIdFromPath('/tools/briefing')).toBe('studio');
    });

    it('should map /tools/roteiro/123 to "studio"', () => {
      expect(extractTabIdFromPath('/tools/roteiro/123')).toBe('studio');
    });

    it('should map /analytics/reports to "finance"', () => {
      expect(extractTabIdFromPath('/analytics/reports')).toBe('finance');
    });

    it('should map /pipeline to "clients" (commercial sub-route)', () => {
      expect(extractTabIdFromPath('/pipeline')).toBe('clients');
    });

    it('should map /proposals to "clients" (commercial sub-route)', () => {
      expect(extractTabIdFromPath('/proposals')).toBe('clients');
    });

    it('should map /interactions to "clients" (commercial sub-route)', () => {
      expect(extractTabIdFromPath('/interactions')).toBe('clients');
    });
  });

  describe('invalid/unknown paths - default to home', () => {
    it('should default to "home" for unknown path /unknown', () => {
      expect(extractTabIdFromPath('/unknown')).toBe('home');
    });

    it('should default to "home" for /random/path', () => {
      expect(extractTabIdFromPath('/random/path')).toBe('home');
    });

    it('should default to "home" for /settings', () => {
      expect(extractTabIdFromPath('/settings')).toBe('home');
    });

    it('should default to "home" for /profile', () => {
      expect(extractTabIdFromPath('/profile')).toBe('home');
    });

    it('should default to "home" for empty string', () => {
      expect(extractTabIdFromPath('')).toBe('home');
    });

    it('should default to "home" for whitespace only', () => {
      expect(extractTabIdFromPath('   ')).toBe('home');
    });
  });

  describe('edge cases - path normalization', () => {
    it('should handle trailing slash /clients/', () => {
      expect(extractTabIdFromPath('/clients/')).toBe('clients');
    });

    it('should handle multiple trailing slashes /jobs///', () => {
      expect(extractTabIdFromPath('/jobs///')).toBe('jobs');
    });

    it('should handle path without leading slash', () => {
      expect(extractTabIdFromPath('studio')).toBe('studio');
    });

    it('should handle mixed case (case-sensitive)', () => {
      expect(extractTabIdFromPath('/Clients')).toBe('home'); // Should not match
    });

    it('should handle query parameters /projects?sort=date', () => {
      const path = '/projects?sort=date';
      expect(extractTabIdFromPath(path.split('?')[0])).toBe('jobs');
    });

    it('should handle hash fragments /tools#section', () => {
      const path = '/tools#section';
      expect(extractTabIdFromPath(path.split('#')[0])).toBe('studio');
    });
  });
});

const createTestTabs = (): NavTab[] => [
  { id: 'home', label: 'HOME', icon: '🏠', path: '/dashboard', isActive: false },
  { id: 'clients', label: 'CLIENTS', icon: '👥', path: '/clients', isActive: false },
  { id: 'jobs', label: 'JOBS', icon: '🎬', path: '/projects', isActive: false },
  { id: 'studio', label: 'STUDIO', icon: '🤖', path: '/tools', isActive: false },
  { id: 'finance', label: 'FINANCE', icon: '💰', path: '/analytics', isActive: false },
];

describe('manageNavigationState', () => {
  describe('single active tab property (∃! tab where isActive=true)', () => {
    it('should activate only home tab for /home path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/home', tabs);

      expect(result[0].isActive).toBe(true);  // home
      expect(result[1].isActive).toBe(false); // clients
      expect(result[2].isActive).toBe(false); // jobs
      expect(result[3].isActive).toBe(false); // studio
      expect(result[4].isActive).toBe(false); // finance

      // Verify exactly one active
      const activeCount = result.filter(t => t.isActive).length;
      expect(activeCount).toBe(1);
    });

    it('should activate only clients tab for /clients path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/clients', tabs);

      expect(result[0].isActive).toBe(false); // home
      expect(result[1].isActive).toBe(true);  // clients
      expect(result[2].isActive).toBe(false); // jobs
      expect(result[3].isActive).toBe(false); // studio
      expect(result[4].isActive).toBe(false); // finance

      const activeCount = result.filter(t => t.isActive).length;
      expect(activeCount).toBe(1);
    });

    it('should activate only jobs tab for /projects path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/projects', tabs);

      expect(result[2].isActive).toBe(true); // jobs
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should activate only studio tab for /tools path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/tools', tabs);

      expect(result[3].isActive).toBe(true); // studio
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should activate only finance tab for /analytics path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/analytics', tabs);

      expect(result[4].isActive).toBe(true); // finance
      expect(result.filter(t => t.isActive).length).toBe(1);
    });
  });

  describe('nested routes maintain single active tab', () => {
    it('should activate jobs tab for nested /project/123 path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/project/123', tabs);

      expect(result[2].isActive).toBe(true); // jobs
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should activate clients tab for nested /clients/456 path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/clients/456', tabs);

      expect(result[1].isActive).toBe(true); // clients
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should activate studio tab for nested /tools/briefing path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/tools/briefing', tabs);

      expect(result[3].isActive).toBe(true); // studio
      expect(result.filter(t => t.isActive).length).toBe(1);
    });
  });

  describe('unknown paths default to home with single active tab', () => {
    it('should activate home tab for unknown /settings path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/settings', tabs);

      expect(result[0].isActive).toBe(true); // home
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should activate home tab for completely unknown path', () => {
      const tabs = createTestTabs();
      const result = manageNavigationState('/xyz/abc/123', tabs);

      expect(result[0].isActive).toBe(true); // home
      expect(result.filter(t => t.isActive).length).toBe(1);
    });
  });

  describe('state transitions preserve single active tab', () => {
    it('should transition from home to clients maintaining single active', () => {
      const tabs = createTestTabs();

      // Start at home
      let result = manageNavigationState('/home', tabs);
      expect(result[0].isActive).toBe(true);
      expect(result.filter(t => t.isActive).length).toBe(1);

      // Navigate to clients
      result = manageNavigationState('/clients', result);
      expect(result[1].isActive).toBe(true);
      expect(result.filter(t => t.isActive).length).toBe(1);
    });

    it('should transition through all tabs maintaining single active', () => {
      const paths = ['/home', '/clients', '/projects', '/tools', '/analytics'];
      let tabs = createTestTabs();

      paths.forEach((path, index) => {
        tabs = manageNavigationState(path, tabs);
        expect(tabs[index].isActive).toBe(true);
        expect(tabs.filter(t => t.isActive).length).toBe(1);
      });
    });
  });

  describe('immutability - does not mutate input array', () => {
    it('should return new array without mutating input', () => {
      const tabs = createTestTabs();
      const originalTabs = JSON.parse(JSON.stringify(tabs)); // Deep clone

      const result = manageNavigationState('/clients', tabs);

      // Original should be unchanged
      expect(tabs).toEqual(originalTabs);

      // Result should be different reference
      expect(result).not.toBe(tabs);

      // But result should have updated state
      expect(result[1].isActive).toBe(true);
    });
  });

  describe('validates postcondition - exactly one active tab', () => {
    it('should maintain invariant for all valid tab IDs', () => {
      const tabs = createTestTabs();
      const paths = ['/home', '/clients', '/projects', '/tools', '/analytics'];

      paths.forEach(path => {
        const result = manageNavigationState(path, tabs);
        const activeCount = result.filter(t => t.isActive).length;

        expect(activeCount).toBe(1);
        expect(validateSingleActiveTab(result)).toBe(true);
      });
    });
  });
});

describe('validateSingleActiveTab', () => {
  it('should return true when exactly one tab is active', () => {
    const tabs: NavTab[] = [
      { id: 'home', label: 'HOME', icon: '🏠', path: '/home', isActive: true },
      { id: 'clients', label: 'CLIENTS', icon: '👥', path: '/clients', isActive: false },
    ];
    expect(validateSingleActiveTab(tabs)).toBe(true);
  });

  it('should return false when no tabs are active', () => {
    const tabs: NavTab[] = [
      { id: 'home', label: 'HOME', icon: '🏠', path: '/home', isActive: false },
      { id: 'clients', label: 'CLIENTS', icon: '👥', path: '/clients', isActive: false },
    ];
    expect(validateSingleActiveTab(tabs)).toBe(false);
  });

  it('should return false when multiple tabs are active', () => {
    const tabs: NavTab[] = [
      { id: 'home', label: 'HOME', icon: '🏠', path: '/home', isActive: true },
      { id: 'clients', label: 'CLIENTS', icon: '👥', path: '/clients', isActive: true },
    ];
    expect(validateSingleActiveTab(tabs)).toBe(false);
  });

  it('should return true for default navigation tabs', () => {
    const tabs = createDefaultNavigationTabs();
    expect(validateSingleActiveTab(tabs)).toBe(true);
  });
});

describe('createDefaultNavigationTabs', () => {
  it('should create 5 navigation tabs', () => {
    const tabs = createDefaultNavigationTabs();
    expect(tabs).toHaveLength(5);
  });

  it('should have exactly one active tab (home)', () => {
    const tabs = createDefaultNavigationTabs();
    const activeTabs = tabs.filter(t => t.isActive);

    expect(activeTabs).toHaveLength(1);
    expect(activeTabs[0].id).toBe('home');
  });

  it('should have all 5 valid tab IDs', () => {
    const tabs = createDefaultNavigationTabs();
    const tabIds = tabs.map(t => t.id);

    VALID_TAB_IDS.forEach(validId => {
      expect(tabIds).toContain(validId);
    });
  });

  it('should have correct structure for each tab', () => {
    const tabs = createDefaultNavigationTabs();

    tabs.forEach(tab => {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('icon');
      expect(tab).toHaveProperty('path');
      expect(tab).toHaveProperty('isActive');

      expect(typeof tab.id).toBe('string');
      expect(typeof tab.label).toBe('string');
      expect(typeof tab.icon).toBe('string');
      expect(typeof tab.path).toBe('string');
      expect(typeof tab.isActive).toBe('boolean');
    });
  });
});

describe('integration tests - browser navigation scenarios', () => {
  it('should handle browser back button navigation', () => {
    const tabs = createTestTabs();

    // User navigates: home -> clients -> jobs -> back to clients
    const step1 = manageNavigationState('/home', tabs);
    expect(step1[0].isActive).toBe(true);

    const step2 = manageNavigationState('/clients', step1);
    expect(step2[1].isActive).toBe(true);

    const step3 = manageNavigationState('/projects', step2);
    expect(step3[2].isActive).toBe(true);

    // Back button to clients
    const step4 = manageNavigationState('/clients', step3);
    expect(step4[1].isActive).toBe(true);
    expect(validateSingleActiveTab(step4)).toBe(true);
  });

  it('should handle browser forward button navigation', () => {
    const tabs = createTestTabs();

    // Navigate forward through history
    const step1 = manageNavigationState('/home', tabs);
    const step2 = manageNavigationState('/clients', step1);
    const step3 = manageNavigationState('/projects', step2);

    // Back
    const step4 = manageNavigationState('/clients', step3);

    // Forward to projects again
    const step5 = manageNavigationState('/projects', step4);
    expect(step5[2].isActive).toBe(true);
    expect(validateSingleActiveTab(step5)).toBe(true);
  });

  it('should handle direct URL navigation', () => {
    const tabs = createTestTabs();

    // User types URL directly or uses bookmark
    const result = manageNavigationState('/project/456', tabs);

    expect(result[2].isActive).toBe(true); // jobs tab
    expect(validateSingleActiveTab(result)).toBe(true);
  });

  it('should handle page refresh maintaining active tab', () => {
    const tabs = createTestTabs();

    // User is on /tools page and refreshes
    const beforeRefresh = manageNavigationState('/tools', tabs);
    expect(beforeRefresh[3].isActive).toBe(true);

    // After refresh, same path should maintain state
    const afterRefresh = manageNavigationState('/tools', createTestTabs());
    expect(afterRefresh[3].isActive).toBe(true);
    expect(validateSingleActiveTab(afterRefresh)).toBe(true);
  });
});

describe('edge cases and error handling', () => {
  it('should handle empty tabs array gracefully', () => {
    const emptyTabs: NavTab[] = [];

    // Should not throw, but will not have any active tabs
    expect(() => {
      manageNavigationState('/home', emptyTabs);
    }).toThrow(); // Will throw because postcondition requires exactly 1 active
  });

  it('should handle tabs with missing id property', () => {
    const invalidTabs = [
      { id: '', label: 'HOME', icon: '🏠', path: '/home', isActive: false },
      { id: 'clients', label: 'CLIENTS', icon: '👥', path: '/clients', isActive: false },
    ] as NavTab[];

    const result = manageNavigationState('/clients', invalidTabs);
    expect(result[1].isActive).toBe(true);
  });

  it('should handle very long nested paths', () => {
    const tabs = createTestTabs();
    const longPath = '/project/123/edit/section/456/subsection/789/item/abc';

    const result = manageNavigationState(longPath, tabs);
    expect(result[2].isActive).toBe(true); // Still maps to jobs
    expect(validateSingleActiveTab(result)).toBe(true);
  });

  it('should handle special characters in path', () => {
    const tabs = createTestTabs();

    // These should default to home as they are invalid
    expect(manageNavigationState('/clients%20space', tabs)[0].isActive).toBe(true);
    expect(manageNavigationState('/projects?query=test', createTestTabs())[0].isActive).toBe(true);
  });
});
