/**
 * Sprint 68 / Step 32: Notification provider interface
 * ConsoleProvider is the default — logs to console, marks delivery as sent.
 * Replace with real Telegram/Email/SMS providers when ready.
 */

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(params: {
    to: string;
    channel: string;
    subject?: string;
    body: string;
  }): Promise<SendResult>;
}

/**
 * Console provider: writes to server log, always succeeds.
 * Used when no real provider is configured.
 */
export class ConsoleProvider implements NotificationProvider {
  readonly name = "console";

  async send(params: {
    to: string;
    channel: string;
    subject?: string;
    body: string;
  }): Promise<SendResult> {
    const msgId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[NotificationProvider:console] channel=${params.channel} to=${params.to} subject=${params.subject ?? "(none)"} body=${params.body.slice(0, 120)}...`,
    );
    return { success: true, messageId: msgId };
  }
}

/** Singleton provider — swap for real integration later */
let _provider: NotificationProvider = new ConsoleProvider();

export function getProvider(): NotificationProvider {
  return _provider;
}

export function setProvider(provider: NotificationProvider): void {
  _provider = provider;
}
