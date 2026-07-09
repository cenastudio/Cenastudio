import { describe, it, expect } from "vitest";

/**
 * Fuzzy search implementation (duplicated for testing)
 * Matches if query characters appear in order in the target string
 */
function fuzzyMatch(query: string, target: string, keywords: string[]): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase();

  if (!normalizedQuery) return true;

  // Exact match check
  if (normalizedTarget.includes(normalizedQuery)) return true;

  // Check keywords
  if (keywords.some(keyword => keyword.toLowerCase().includes(normalizedQuery))) {
    return true;
  }

  // Fuzzy match: characters in order
  let queryIndex = 0;
  for (let i = 0; i < normalizedTarget.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedTarget[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === normalizedQuery.length;
}

describe("Fuzzy Search Algorithm", () => {
  describe("Exact Match", () => {
    it("should match exact substring", () => {
      expect(fuzzyMatch("client", "clients", [])).toBe(true);
      expect(fuzzyMatch("home", "homepage", [])).toBe(true);
      expect(fuzzyMatch("studio", "studio ai", [])).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(fuzzyMatch("HOME", "home", [])).toBe(true);
      expect(fuzzyMatch("Client", "CLIENTS", [])).toBe(true);
      expect(fuzzyMatch("StUdIo", "studio", [])).toBe(true);
    });

    it("should handle whitespace", () => {
      expect(fuzzyMatch(" client ", "clients", [])).toBe(true);
      expect(fuzzyMatch("home   ", "homepage", [])).toBe(true);
    });
  });

  describe("Fuzzy Match - Characters in Order", () => {
    it("should match 'cli' to 'clients'", () => {
      expect(fuzzyMatch("cli", "clients", [])).toBe(true);
    });

    it("should match 'hom' to 'home'", () => {
      expect(fuzzyMatch("hom", "home", [])).toBe(true);
    });

    it("should match 'stud' to 'studio'", () => {
      expect(fuzzyMatch("stud", "studio", [])).toBe(true);
    });

    it("should match 'fin' to 'finance'", () => {
      expect(fuzzyMatch("fin", "finance", [])).toBe(true);
    });

    it("should match 'job' to 'jobs'", () => {
      expect(fuzzyMatch("job", "jobs", [])).toBe(true);
    });

    it("should match characters with gaps", () => {
      expect(fuzzyMatch("cet", "clients", [])).toBe(true); // c-li-e-nts
      expect(fuzzyMatch("hme", "home", [])).toBe(true); // h-o-me
    });

    it("should not match out-of-order characters", () => {
      expect(fuzzyMatch("tne", "clients", [])).toBe(false);
      expect(fuzzyMatch("mho", "home", [])).toBe(false);
    });

    it("should not match when characters are missing", () => {
      expect(fuzzyMatch("xyz", "clients", [])).toBe(false);
      expect(fuzzyMatch("abc", "home", [])).toBe(false);
    });
  });

  describe("Keyword Matching", () => {
    it("should match via keywords", () => {
      expect(fuzzyMatch("dashboard", "HOME", ["dashboard", "home"])).toBe(true);
      expect(fuzzyMatch("crm", "CLIENTS", ["clients", "crm"])).toBe(true);
      expect(fuzzyMatch("ai", "STUDIO", ["studio", "ai", "tools"])).toBe(true);
    });

    it("should match partial keyword match", () => {
      expect(fuzzyMatch("dash", "HOME", ["dashboard", "home"])).toBe(true);
      expect(fuzzyMatch("proj", "JOBS", ["projects", "jobs"])).toBe(true);
    });

    it("should be case insensitive for keywords", () => {
      expect(fuzzyMatch("DASHBOARD", "home", ["dashboard"])).toBe(true);
      expect(fuzzyMatch("Crm", "clients", ["CRM"])).toBe(true);
    });
  });

  describe("Empty Query", () => {
    it("should return true for empty query", () => {
      expect(fuzzyMatch("", "clients", [])).toBe(true);
      expect(fuzzyMatch("   ", "home", [])).toBe(true);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should match Portuguese keywords", () => {
      expect(fuzzyMatch("clientes", "CLIENTS", ["clients", "clientes"])).toBe(true);
      expect(fuzzyMatch("inicio", "HOME", ["home", "inicio", "painel"])).toBe(true);
      expect(fuzzyMatch("financeiro", "FINANCE", ["finance", "financeiro"])).toBe(true);
    });

    it("should match common abbreviations", () => {
      expect(fuzzyMatch("ia", "STUDIO", ["studio", "ai", "ia"])).toBe(true);
      expect(fuzzyMatch("proj", "JOBS", ["jobs", "projects", "projetos"])).toBe(true);
    });

    it("should handle multilingual searches", () => {
      expect(fuzzyMatch("trabalhos", "JOBS", ["jobs", "projects", "trabalhos"])).toBe(true);
      expect(fuzzyMatch("ferramentas", "STUDIO", ["studio", "tools", "ferramentas"])).toBe(true);
    });

    it("should match navigation paths", () => {
      expect(fuzzyMatch("comm", "CLIENTS", ["commercial", "crm", "clients"])).toBe(true);
      expect(fuzzyMatch("anal", "FINANCE", ["analytics", "finance"])).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single character queries", () => {
      expect(fuzzyMatch("c", "clients", [])).toBe(true);
      expect(fuzzyMatch("h", "home", [])).toBe(true);
      expect(fuzzyMatch("z", "clients", [])).toBe(false);
    });

    it("should handle long queries", () => {
      expect(fuzzyMatch("clientsmanagement", "clients", [])).toBe(false);
      expect(fuzzyMatch("homepagedasboard", "home", [])).toBe(false);
    });

    it("should handle special characters", () => {
      expect(fuzzyMatch("cli-ent", "clients", [])).toBe(false);
      expect(fuzzyMatch("home/page", "home", [])).toBe(false);
    });

    it("should handle numeric characters", () => {
      expect(fuzzyMatch("123", "project123", [])).toBe(true);
      expect(fuzzyMatch("proj1", "project123", [])).toBe(true);
    });
  });

  describe("Performance Test Cases", () => {
    it("should handle repeated characters", () => {
      expect(fuzzyMatch("aaa", "aardvark", [])).toBe(true);
      expect(fuzzyMatch("eee", "clients", [])).toBe(false);
    });

    it("should handle targets with spaces", () => {
      expect(fuzzyMatch("cli", "client management", [])).toBe(true);
      expect(fuzzyMatch("mgmt", "client management", [])).toBe(true);
    });

    it("should match first occurrence of characters", () => {
      expect(fuzzyMatch("oi", "options", [])).toBe(true);
      // "options" has two 'o's (index 0 and 4), so "oo" is a valid
      // in-order subsequence match — consistent with the "aaa" matching
      // "aardvark" case above, which also relies on a repeated,
      // non-adjacent character.
      expect(fuzzyMatch("oo", "options", [])).toBe(true);
    });
  });
});
