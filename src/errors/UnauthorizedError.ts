import { BaseError } from "./BaseError";

export class UnauthorizedError extends BaseError {
  constructor(message = "Você não está autorizado.") {
    super(message);
  }
}
