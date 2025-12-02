import validator from 'validator';
import { Request, Response, NextFunction } from 'express';

export const sanitize = {
  email(input: string | undefined | null): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    return validator.normalizeEmail(trimmed) || trimmed.toLowerCase();
  },

  phone(input: string | undefined | null): string {
    if (!input) return '';
    return input.replace(/[^\d+\-() ]/g, '').slice(0, 20);
  },

  businessName(input: string | undefined | null): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    const noHtml = trimmed.replace(/<[^>]*>/g, '');
    const noScripts = noHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return noScripts.slice(0, 100);
  },

  text(input: string | undefined | null, maxLength: number = 500): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    const noHtml = trimmed.replace(/<[^>]*>/g, '');
    const noScripts = noHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return noScripts.slice(0, maxLength);
  },

  textPreserveNewlines(input: string | undefined | null, maxLength: number = 2000): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    const noHtml = trimmed.replace(/<[^>]*>/g, '');
    const noScripts = noHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return noScripts.slice(0, maxLength);
  },

  name(input: string | undefined | null): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    const noHtml = trimmed.replace(/<[^>]*>/g, '');
    return noHtml.slice(0, 50);
  },

  url(input: string | undefined | null): string {
    if (!input) return '';
    const trimmed = validator.trim(input);
    if (!trimmed) return '';
    if (validator.isURL(trimmed, { protocols: ['http', 'https'], require_protocol: false })) {
      return trimmed.slice(0, 500);
    }
    return '';
  },

  alphanumeric(input: string | undefined | null): string {
    if (!input) return '';
    return input.replace(/[^a-zA-Z0-9\s\-_]/g, '').slice(0, 100);
  },

  integer(input: string | number | undefined | null): number | null {
    if (input === undefined || input === null) return null;
    const num = typeof input === 'string' ? parseInt(input, 10) : input;
    return isNaN(num) ? null : num;
  },

  float(input: string | number | undefined | null): number | null {
    if (input === undefined || input === null) return null;
    const num = typeof input === 'string' ? parseFloat(input) : input;
    return isNaN(num) ? null : num;
  },

  boolean(input: unknown): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true' || input === '1';
    }
    return !!input;
  },

  uuid(input: string | undefined | null): string | null {
    if (!input) return null;
    const trimmed = validator.trim(input);
    return validator.isUUID(trimmed) ? trimmed : null;
  },

  sqlIdentifier(input: string | undefined | null): string {
    if (!input) return '';
    return input.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64);
  },

  array<T>(input: unknown, itemSanitizer: (item: unknown) => T): T[] {
    if (!Array.isArray(input)) return [];
    return input.map(itemSanitizer);
  },
};

export const validate = {
  email(input: string | undefined | null): boolean {
    if (!input) return false;
    return validator.isEmail(input);
  },

  phone(input: string | undefined | null): boolean {
    if (!input) return true;
    const cleaned = input.replace(/[\s\-()]/g, '');
    return /^\+?\d{7,15}$/.test(cleaned);
  },

  businessName(input: string | undefined | null): boolean {
    if (!input) return false;
    const trimmed = validator.trim(input);
    return trimmed.length >= 2 && trimmed.length <= 100;
  },

  password(input: string | undefined | null): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input) {
      return { valid: false, errors: ['Password is required'] };
    }
    if (input.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(input)) errors.push('Password must contain an uppercase letter');
    if (!/[a-z]/.test(input)) errors.push('Password must contain a lowercase letter');
    if (!/\d/.test(input)) errors.push('Password must contain a number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(input)) errors.push('Password must contain a special character');
    return { valid: errors.length === 0, errors };
  },

  required(input: unknown): boolean {
    if (input === undefined || input === null) return false;
    if (typeof input === 'string') return validator.trim(input).length > 0;
    return true;
  },

  uuid(input: string | undefined | null): boolean {
    if (!input) return false;
    return validator.isUUID(input);
  },

  positiveInteger(input: number | undefined | null): boolean {
    if (input === undefined || input === null) return false;
    return Number.isInteger(input) && input > 0;
  },

  nonNegativeNumber(input: number | undefined | null): boolean {
    if (input === undefined || input === null) return false;
    return typeof input === 'number' && input >= 0;
  },

  inRange(input: number | undefined | null, min: number, max: number): boolean {
    if (input === undefined || input === null) return false;
    return input >= min && input <= max;
  },

  maxLength(input: string | undefined | null, max: number): boolean {
    if (!input) return true;
    return input.length <= max;
  },

  isOneOf<T>(input: T, allowed: T[]): boolean {
    return allowed.includes(input);
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export function createValidationMiddleware(
  rules: {
    field: string;
    location: 'body' | 'params' | 'query';
    validators: Array<{
      validate: (value: unknown) => boolean;
      message: string;
    }>;
    optional?: boolean;
  }[]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const source = rule.location === 'body' ? req.body :
                     rule.location === 'params' ? req.params : req.query;
      const value = source?.[rule.field];

      if (rule.optional && (value === undefined || value === null || value === '')) {
        continue;
      }

      for (const validator of rule.validators) {
        if (!validator.validate(value)) {
          errors.push({ field: rule.field, message: validator.message });
          break;
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}

export function sanitizeBookingInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    businessName: data.businessName ? sanitize.businessName(data.businessName as string) : data.businessName,
    contactName: data.contactName ? sanitize.name(data.contactName as string) : data.contactName,
    email: data.email ? sanitize.email(data.email as string) : data.email,
    phone: data.phone ? sanitize.phone(data.phone as string) : data.phone,
    industryDescription: data.industryDescription ? sanitize.text(data.industryDescription as string, 500) : data.industryDescription,
    notes: data.notes ? sanitize.textPreserveNewlines(data.notes as string, 2000) : data.notes,
    adminNotes: data.adminNotes ? sanitize.textPreserveNewlines(data.adminNotes as string, 2000) : data.adminNotes,
    websiteUrl: data.websiteUrl ? sanitize.url(data.websiteUrl as string) : data.websiteUrl,
  };
}

export function sanitizeUserInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    username: data.username ? sanitize.name(data.username as string) : data.username,
    email: data.email ? sanitize.email(data.email as string) : data.email,
    firstName: data.firstName ? sanitize.name(data.firstName as string) : data.firstName,
    lastName: data.lastName ? sanitize.name(data.lastName as string) : data.lastName,
    businessName: data.businessName ? sanitize.businessName(data.businessName as string) : data.businessName,
    phone: data.phone ? sanitize.phone(data.phone as string) : data.phone,
    businessLicenseNumber: data.businessLicenseNumber ? sanitize.alphanumeric(data.businessLicenseNumber as string) : data.businessLicenseNumber,
  };
}

export function sanitizeCampaignInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    name: data.name ? sanitize.text(data.name as string, 100) : data.name,
    description: data.description ? sanitize.textPreserveNewlines(data.description as string, 1000) : data.description,
  };
}

export function sanitizeRouteInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    name: data.name ? sanitize.text(data.name as string, 100) : data.name,
    description: data.description ? sanitize.textPreserveNewlines(data.description as string, 500) : data.description,
    city: data.city ? sanitize.text(data.city as string, 50) : data.city,
    zipCodes: data.zipCodes ? sanitize.text(data.zipCodes as string, 200) : data.zipCodes,
  };
}

export function sanitizeIndustryInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    name: data.name ? sanitize.text(data.name as string, 100) : data.name,
    description: data.description ? sanitize.textPreserveNewlines(data.description as string, 500) : data.description,
  };
}

export function sanitizeNoteInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    content: data.content ? sanitize.textPreserveNewlines(data.content as string, 2000) : data.content,
  };
}

export function sanitizeTagInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    name: data.name ? sanitize.text(data.name as string, 50) : data.name,
    color: data.color ? sanitize.alphanumeric(data.color as string) : data.color,
  };
}

export function sanitizeDesignBriefInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    headline: data.headline ? sanitize.text(data.headline as string, 200) : data.headline,
    keyMessage: data.keyMessage ? sanitize.textPreserveNewlines(data.keyMessage as string, 1000) : data.keyMessage,
    callToAction: data.callToAction ? sanitize.text(data.callToAction as string, 200) : data.callToAction,
    contactInfo: data.contactInfo ? sanitize.textPreserveNewlines(data.contactInfo as string, 500) : data.contactInfo,
    additionalNotes: data.additionalNotes ? sanitize.textPreserveNewlines(data.additionalNotes as string, 2000) : data.additionalNotes,
    socialMediaHandles: data.socialMediaHandles ? sanitize.text(data.socialMediaHandles as string, 500) : data.socialMediaHandles,
    websiteUrl: data.websiteUrl ? sanitize.url(data.websiteUrl as string) : data.websiteUrl,
    couponCode: data.couponCode ? sanitize.text(data.couponCode as string, 50) : data.couponCode,
  };
}

export function sanitizeWaitlistInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    businessName: data.businessName ? sanitize.businessName(data.businessName as string) : data.businessName,
    contactName: data.contactName ? sanitize.name(data.contactName as string) : data.contactName,
    email: data.email ? sanitize.email(data.email as string) : data.email,
    phone: data.phone ? sanitize.phone(data.phone as string) : data.phone,
    notes: data.notes ? sanitize.textPreserveNewlines(data.notes as string, 1000) : data.notes,
  };
}

export function sanitizeSettingsInput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    value: data.value ? sanitize.textPreserveNewlines(String(data.value), 5000) : data.value,
  };
}

console.log('✅ Validation and sanitization utilities loaded');
