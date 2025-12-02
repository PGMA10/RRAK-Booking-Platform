import { z } from "zod";

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireNumber: true,
  requireUppercase: true,
  requireLowercase: true,
  requireSpecialChar: true,
};

export const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  strength: "weak" | "fair" | "good" | "strong";
  strengthScore: number;
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= PASSWORD_REQUIREMENTS.minLength;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\\]/.test(password);

  const checks = [hasMinLength, hasNumber, hasUppercase, hasLowercase, hasSpecialChar];
  const passedChecks = checks.filter(Boolean).length;
  const strengthScore = passedChecks;

  let strength: "weak" | "fair" | "good" | "strong" = "weak";
  if (passedChecks >= 5) strength = "strong";
  else if (passedChecks >= 4) strength = "good";
  else if (passedChecks >= 3) strength = "fair";

  return {
    isValid: passedChecks === 5,
    hasMinLength,
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    strength,
    strengthScore,
  };
}

export const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.minLength, `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  .max(50, "Password must be less than 50 characters")
  .refine((password) => /\d/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\\]/.test(password), {
    message: "Password must contain at least one special character (!@#$%^&*...)",
  });
