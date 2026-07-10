import { describe, it, expect } from "vitest";
import {
  isValidHex,
  parseHexColor,
  colorToRgbString,
  hexToRgba,
} from "@shared/color";

describe("shared/color", () => {
  describe("isValidHex", () => {
    it("accepts #RRGGBB (lower and upper case)", () => {
      expect(isValidHex("#e85002")).toBe(true);
      expect(isValidHex("#E85002")).toBe(true);
      expect(isValidHex("#ffffff")).toBe(true);
      expect(isValidHex("#000000")).toBe(true);
    });

    it("accepts #RGB shorthand", () => {
      expect(isValidHex("#abc")).toBe(true);
      expect(isValidHex("#000")).toBe(true);
      expect(isValidHex("#FFF")).toBe(true);
    });

    it("accepts hex without leading #", () => {
      expect(isValidHex("e85002")).toBe(true);
      expect(isValidHex("abc")).toBe(true);
    });

    it("rejects invalid strings", () => {
      expect(isValidHex("#12")).toBe(false);
      expect(isValidHex("#12345")).toBe(false);
      expect(isValidHex("#1234567")).toBe(false);
      expect(isValidHex("foo")).toBe(false);
      expect(isValidHex("")).toBe(false);
      expect(isValidHex("#xyz")).toBe(false);
    });

    it("rejects non-strings", () => {
      expect(isValidHex(null)).toBe(false);
      expect(isValidHex(undefined)).toBe(false);
      expect(isValidHex(123)).toBe(false);
    });
  });

  describe("parseHexColor", () => {
    it("parses #RRGGBB", () => {
      expect(parseHexColor("#e85002")).toEqual([232, 80, 2]);
      expect(parseHexColor("#000000")).toEqual([0, 0, 0]);
      expect(parseHexColor("#FFFFFF")).toEqual([255, 255, 255]);
    });

    it("expands and parses #RGB shorthand", () => {
      expect(parseHexColor("#000")).toEqual([0, 0, 0]);
      expect(parseHexColor("#FFF")).toEqual([255, 255, 255]);
      expect(parseHexColor("#abc")).toEqual([0xaa, 0xbb, 0xcc]);
    });

    it("handles hex without leading #", () => {
      expect(parseHexColor("e85002")).toEqual([232, 80, 2]);
    });

    it("returns null for invalid input", () => {
      expect(parseHexColor("foo")).toBeNull();
      expect(parseHexColor("")).toBeNull();
      expect(parseHexColor("#12")).toBeNull();
      expect(parseHexColor(null)).toBeNull();
    });
  });

  describe("colorToRgbString", () => {
    it("formats as 'R, G, B' with spaces after commas", () => {
      expect(colorToRgbString("#e85002")).toBe("232, 80, 2");
      expect(colorToRgbString("#000")).toBe("0, 0, 0");
    });

    it("falls back to '0, 0, 0' on invalid input", () => {
      expect(colorToRgbString("invalid")).toBe("0, 0, 0");
      expect(colorToRgbString("")).toBe("0, 0, 0");
    });
  });

  describe("hexToRgba", () => {
    it("produces canonical rgba() string", () => {
      expect(hexToRgba("#e85002", 0.5)).toBe("rgba(232, 80, 2, 0.5)");
      expect(hexToRgba("#000", 1)).toBe("rgba(0, 0, 0, 1)");
    });

    it("clamps alpha to [0, 1]", () => {
      expect(hexToRgba("#e85002", 1.5)).toBe("rgba(232, 80, 2, 1)");
      expect(hexToRgba("#e85002", -0.5)).toBe("rgba(232, 80, 2, 0)");
      expect(hexToRgba("#e85002", NaN)).toBe("rgba(232, 80, 2, 0)");
    });

    it("falls back to rgba(0, 0, 0, ...) on invalid hex", () => {
      expect(hexToRgba("invalid", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
      expect(hexToRgba("", 0.3)).toBe("rgba(0, 0, 0, 0.3)");
    });
  });
});
