import { describe, it, expect, vi } from "vitest";
import {
  ConsoleProvider,
  getProvider,
  setProvider,
  type NotificationProvider,
} from "@/lib/notifications/provider";

describe("NotificationProvider", () => {
  describe("ConsoleProvider", () => {
    it("sends successfully and returns messageId", async () => {
      const provider = new ConsoleProvider();
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await provider.send({
        to: "+79991234567",
        channel: "telegram",
        body: "Test message",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^console-/);
      expect(consoleSpy).toHaveBeenCalledOnce();
      consoleSpy.mockRestore();
    });

    it("has name = console", () => {
      const provider = new ConsoleProvider();
      expect(provider.name).toBe("console");
    });
  });

  describe("getProvider / setProvider", () => {
    it("returns ConsoleProvider by default", () => {
      const provider = getProvider();
      expect(provider.name).toBe("console");
    });

    it("can swap provider", () => {
      const mock: NotificationProvider = {
        name: "test",
        send: async () => ({ success: true, messageId: "test-123" }),
      };

      setProvider(mock);
      expect(getProvider().name).toBe("test");

      // Restore
      setProvider(new ConsoleProvider());
    });
  });
});
