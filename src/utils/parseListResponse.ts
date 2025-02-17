// src/utils/parseListResponse.ts

/**
 * Recebe a resposta crua da API, uma chave ("entries", "settled_entries", etc.)
 * e retorna um array do tipo definido em T.
 *
 * Se houver "detail" com mensagem, lança Erro.
 * Se houver "data", desembalar. 
 * Se a chave não existir ou não for Array, lança Erro.
 */
export function parseListResponse<T>(response: unknown, arrayKey: string): T[] {
    // 1) Verifica se é objeto não-nulo com detail preenchido
    if (
      typeof response === 'object' &&
      response !== null &&
      'detail' in response &&
      typeof (response as Record<string, unknown>).detail === 'string' &&
      (response as { detail: string }).detail.trim().length > 0
    ) {
      throw new Error((response as { detail: string }).detail);
    }
  
    // 2) Tenta extrair "data" se existir
    let data: unknown = response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      (response as Record<string, unknown>).data
    ) {
      data = (response as { data: unknown }).data;
    }
  
    // 3) Confere se "data" é objeto, não-nulo, tem a chave `arrayKey` e se é um array
    if (
      typeof data !== 'object' ||
      data === null ||
      !(arrayKey in data) ||
      !Array.isArray((data as Record<string, unknown>)[arrayKey])
    ) {
      throw new Error(
        `Invalid or missing response format "${arrayKey}": ` +
          JSON.stringify(response)
      );
    }
  
    // 4) Retorna o array do tipo <T>
    return (data as Record<string, T[]>)[arrayKey];
  }
  