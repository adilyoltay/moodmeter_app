/**
 * UUID doğrulama yardımcıları
 * - Sürüm agnostik (v1-v5) UUID doğrulaması yapar.
 */

const EMAIL_PATTERN = /^(?:[a-zA-Z0-9_'^&+%`{}~!-]+(?:\.[a-zA-Z0-9_'^&+%`{}~!-]+)*)@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/;

/**
 * Verilen email adresinin temel RFC uyumluluğuna sahip olduğunu kontrol eder.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Kayıt sırasında kullanılan şifrenin temel güvenlik kurallarını sağladığını kontrol eder.
 * - En az 8 karakter
 * - En az bir büyük harf
 * - En az bir rakam
 * - En az bir özel karakter
 */
export function isStrongPassword(password: string | null | undefined): boolean {
  if (!password || typeof password !== 'string') return false;

  const value = password.trim();
  if (value.length < 8) return false;

  const hasUppercase = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return hasUppercase && hasDigit && hasSpecial;
}

/**
 * Verilen metnin UUID biçiminde olup olmadığını kontrol eder.
 * UUID sürümünden bağımsız, genel 8-4-4-4-12 hex desenini kullanır.
 */
export function isUUID(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value);
}

/**
 * Ortak UUID regex'i. Mümkün olduğunca `isUUID()` kullanın.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regex desenine ihtiyaç duyan yerler için tekrar kullanılabilir email pattern'i.
 */
export const EMAIL_REGEX = EMAIL_PATTERN;
