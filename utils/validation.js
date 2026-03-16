const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeText = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
};

const isNonEmptyString = (value) =>
  typeof value === "string" && sanitizeText(value).length > 0;

const isValidEmail = (value) =>
  typeof value === "string" && EMAIL_REGEX.test(sanitizeText(value));

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const toNonNegativeNumber = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const normalizeRole = (role) => {
  if (typeof role !== "string") {
    return "";
  }

  return role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

module.exports = {
  sanitizeText,
  isNonEmptyString,
  isValidEmail,
  toPositiveInt,
  toNonNegativeNumber,
  normalizeRole,
};
