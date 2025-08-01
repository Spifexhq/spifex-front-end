import { BaseError } from "./BaseError";

export class ValidationError extends BaseError {
  constructor(public errors: Record<string, string>) {
    super("Erro de validação nos campos.");
  }
}
