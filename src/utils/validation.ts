/**
 * Input validation utilities for tool parameters
 */

import { ValidationError } from './errors.js';

/**
 * Validate that a required parameter exists and is not empty
 */
export function requireString(value: unknown, paramName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`Parameter '${paramName}' must be a string`, {
      paramName,
      receivedType: typeof value,
    });
  }

  if (value.trim() === '') {
    throw new ValidationError(`Parameter '${paramName}' cannot be empty`, {
      paramName,
    });
  }

  return value;
}

/**
 * Validate that a required parameter exists and is a number
 */
export function requireNumber(value: unknown, paramName: string): number {
  if (typeof value !== 'number') {
    throw new ValidationError(`Parameter '${paramName}' must be a number`, {
      paramName,
      receivedType: typeof value,
    });
  }

  if (isNaN(value)) {
    throw new ValidationError(`Parameter '${paramName}' must be a valid number`, {
      paramName,
    });
  }

  return value;
}

/**
 * Validate that a required parameter exists and is a boolean
 */
export function requireBoolean(value: unknown, paramName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`Parameter '${paramName}' must be a boolean`, {
      paramName,
      receivedType: typeof value,
    });
  }

  return value;
}

/**
 * Validate that a required parameter exists and is an array
 */
export function requireArray(value: unknown, paramName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`Parameter '${paramName}' must be an array`, {
      paramName,
      receivedType: typeof value,
    });
  }

  return value;
}

/**
 * Validate that a required parameter exists and is an object
 */
export function requireObject(value: unknown, paramName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`Parameter '${paramName}' must be an object`, {
      paramName,
      receivedType: Array.isArray(value) ? 'array' : typeof value,
    });
  }

  return value as Record<string, unknown>;
}

/**
 * Validate that a string matches one of the allowed values
 */
export function requireEnum<T extends string>(
  value: unknown,
  paramName: string,
  allowedValues: readonly T[]
): T {
  const str = requireString(value, paramName);

  if (!allowedValues.includes(str as T)) {
    throw new ValidationError(
      `Parameter '${paramName}' must be one of: ${allowedValues.join(', ')}`,
      {
        paramName,
        receivedValue: str,
        allowedValues: allowedValues as unknown as string[],
      }
    );
  }

  return str as T;
}

/**
 * Validate optional string parameter
 */
export function optionalString(value: unknown, paramName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireString(value, paramName);
}

/**
 * Validate optional number parameter
 */
export function optionalNumber(value: unknown, paramName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireNumber(value, paramName);
}

/**
 * Validate optional boolean parameter
 */
export function optionalBoolean(value: unknown, paramName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireBoolean(value, paramName);
}

/**
 * Validate that a string meets minimum length requirement
 */
export function minLength(value: string, min: number, paramName: string): string {
  if (value.length < min) {
    throw new ValidationError(
      `Parameter '${paramName}' must be at least ${min} characters long`,
      {
        paramName,
        minLength: min,
        actualLength: value.length,
      }
    );
  }

  return value;
}

/**
 * Validate that a string doesn't exceed maximum length
 */
export function maxLength(value: string, max: number, paramName: string): string {
  if (value.length > max) {
    throw new ValidationError(
      `Parameter '${paramName}' must be no more than ${max} characters long`,
      {
        paramName,
        maxLength: max,
        actualLength: value.length,
      }
    );
  }

  return value;
}

/**
 * Validate that a number is within a range
 */
export function inRange(value: number, min: number, max: number, paramName: string): number {
  if (value < min || value > max) {
    throw new ValidationError(`Parameter '${paramName}' must be between ${min} and ${max}`, {
      paramName,
      min,
      max,
      actualValue: value,
    });
  }

  return value;
}
