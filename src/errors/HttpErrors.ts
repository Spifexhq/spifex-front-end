import { BaseError } from './BaseError';

export class UnauthorizedError extends BaseError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Acesso proibido') {
    super(message, 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

export class ServerError extends BaseError {
  constructor(message = 'Erro interno no servidor') {
    super(message, 500);
  }
}

export class ValidationError extends BaseError {
  constructor(message = 'Erro de validação') {
    super(message, 400);
  }
}

export class NetworkError extends BaseError {
  constructor(message = 'Sem resposta do servidor') {
    super(message);
  }
}

export class RequestSetupError extends BaseError {
  constructor(message = 'Erro ao configurar a requisição') {
    super(message);
  }
}
