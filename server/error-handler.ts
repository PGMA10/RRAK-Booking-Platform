import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

export function handleError(
  res: Response,
  error: unknown,
  context: string,
  statusCode: number = 500
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`❌ [${context}] Error:`, errorMessage);
  if (!isProduction && errorStack) {
    console.error(`   Stack:`, errorStack);
  }

  res.status(statusCode).json({
    message: getGenericMessage(statusCode),
  });
}

export function handleErrorWithCustomMessage(
  res: Response,
  error: unknown,
  context: string,
  userMessage: string,
  statusCode: number = 500
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`❌ [${context}] Error:`, errorMessage);
  if (!isProduction && errorStack) {
    console.error(`   Stack:`, errorStack);
  }

  res.status(statusCode).json({
    message: userMessage,
  });
}

function getGenericMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "Invalid request. Please check your input and try again.";
    case 401:
      return "Authentication required. Please log in.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 429:
      return "Too many requests. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function logError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`❌ [${context}] Error:`, errorMessage);
  if (!isProduction && errorStack) {
    console.error(`   Stack:`, errorStack);
  }
}
