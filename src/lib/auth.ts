const otpStore = new Map<
  string,
  {
    code: string;
    expiresAt: number;
  }
>();

const normalize = (contact: string) => contact.trim().toLowerCase();

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const requestOtp = (contact: string) => {
  const normalized = normalize(contact);
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpStore.set(normalized, { code, expiresAt });
  return code;
};

export const verifyOtp = (contact: string, code: string) => {
  const normalized = normalize(contact);
  const record = otpStore.get(normalized);
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    otpStore.delete(normalized);
    return false;
  }
  const isValid = record.code === code.trim();
  if (isValid) {
    otpStore.delete(normalized);
  }
  return isValid;
};
