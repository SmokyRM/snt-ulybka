import { Plot } from "@/types/snt";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?\d{5,15}$/;

export const validatePlotInput = (input: {
  street?: string;
  number?: string;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: Plot["membershipStatus"];
  notes?: string | null;
}) => {
  const errors: string[] = [];
  const street = input.street?.trim() ?? "";
  const number = input.number?.trim() ?? "";
  if (street.length < 2 || street.length > 80) {
    errors.push("Улица должна быть от 2 до 80 символов.");
  }
  if (number.length < 1 || number.length > 20) {
    errors.push("Номер участка должен быть от 1 до 20 символов.");
  }
  if (input.ownerFullName && input.ownerFullName.length > 120) {
    errors.push("ФИО не должно превышать 120 символов.");
  }
  if (input.phone && !phoneRegex.test(input.phone)) {
    errors.push("Некорректный телефон.");
  }
  if (input.email && !emailRegex.test(input.email)) {
    errors.push("Некорректный email.");
  }
  if (input.notes && input.notes.length > 2000) {
    errors.push("Примечание не должно превышать 2000 символов.");
  }
  return errors;
};

