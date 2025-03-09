// @/utils/parseApiList.ts

/**
 * Receives the raw response from the API, a key ("entries", "settled_entries", etc.)
 * and returns an array of the type defined in T.
 *
 * If `status === 'error'`, throws new Error(response.message).
 * If `data` is missing or the key does not exist/is not an Array, it throws Error.
 */
export function parseApiList<T>(response: unknown, arrayKey: string): T[] {
  // Verifica se a resposta é um objeto não-nulo
  if (typeof response !== 'object' || response === null) {
    throw new Error(`Resposta inválida: ${JSON.stringify(response)}`);
  }

  // Faz casting parcial para acessar as chaves de IApiResponse
  const { status, message, data } = response as {
    status?: string;
    message?: string;
    data?: unknown;
  };

  // Se for um status de erro, lança uma exceção com a mensagem
  if (status === 'error') {
    throw new Error(message || 'Erro desconhecido');
  }

  // Garante que data seja um objeto não-nulo
  if (typeof data !== 'object' || data === null) {
    throw new Error(
      `Resposta inválida: A chave 'data' está ausente ou não é um objeto.`
    );
  }

  // Verifica se a chave arrayKey existe em data e se é um array
  if (!(arrayKey in data) || !Array.isArray((data as Record<string, unknown>)[arrayKey])) {
    throw new Error(
      `Formato de resposta inválido ou chave '${arrayKey}' ausente em 'data': ` +
        JSON.stringify(response)
    );
  }

  // Retorna o array de tipo <T>
  return (data as Record<string, T[]>)[arrayKey];
}
