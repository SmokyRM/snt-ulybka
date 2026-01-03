export class OpenAIKeyMissingError extends Error {
  constructor() {
    super("OPENAI_API_KEY missing");
    this.name = "OpenAIKeyMissingError";
  }
}

export const getOpenAIKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIKeyMissingError();
  }
  return apiKey;
};

export const hasOpenAIKey = (): boolean => Boolean(process.env.OPENAI_API_KEY?.trim());

export const createOpenAIClient = <T>(factory: (apiKey: string) => T): T => {
  const apiKey = getOpenAIKey();
  return factory(apiKey);
};
