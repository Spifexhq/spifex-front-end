// @/utils/parseListResponse.ts

/**
 * Receives the raw response from the API, a key ("entries", "settled_entries", etc.)
 * and returns an array of the type defined in T.
 *
 * If there is "detail" with message, throws Error.
 * If there is "date", unpack. 
 * If the key does not exist or is not an Array, it throws Error.
 */
export function parseListResponse<T>(response: unknown, arrayKey: string): T[] {
    // 1) Checks if it is a non-null object with detail filled in
    if (
      typeof response === 'object' &&
      response !== null &&
      'detail' in response &&
      typeof (response as Record<string, unknown>).detail === 'string' &&
      (response as { detail: string }).detail.trim().length > 0
    ) {
      throw new Error((response as { detail: string }).detail);
    }
  
    // 2) Try to extract "data" if it exists
    let data: unknown = response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      (response as Record<string, unknown>).data
    ) {
      data = (response as { data: unknown }).data;
    }
  
    // 3) Checks if "data" is an object, non-null, has the key `arrayKey` and if it is an array
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
  
    // 4) Returns the array of type <T>
    return (data as Record<string, T[]>)[arrayKey];
  }
  