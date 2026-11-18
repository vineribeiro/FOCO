/** Keep actionable validation messages; replace transport/storage internals with recovery copy. */
export function actionErrorMessage(error: unknown, fallback: string): string {
  const value = error && typeof error === 'object' ? error as {message?: unknown; code?: unknown; status?: unknown; name?: unknown} : null;
  const message = typeof value?.message === 'string' ? value.message.trim() : typeof error === 'string' ? error.trim() : '';
  const status = typeof value?.status === 'number' ? value.status : undefined;
  if (status === 401 || value?.code === 'SESSION_CHANGED' || /usu[aá]rio n[aã]o encontrado|sess[aã]o n[aã]o autorizada|token de autentica[cç][aã]o|sess[aã]o (?:ausente|expirou|expirada)/i.test(message))
    return 'Entre novamente no FOCO para confirmar sua sessão e tentar de novo.';
  if (value?.code === 'NETWORK_ERROR' || /failed to fetch|networkerror|network request failed|load failed/i.test(message))
    return fallback;
  if (['TypeError','SyntaxError','ReferenceError'].includes(String(value?.name)) || value?.code === 'REQUEST_TIMEOUT' || value?.code === 'INVALID_RESPONSE' || value?.name === 'AbortError')
    return fallback;
  if (status === 429)
    return 'O limite de solicitações foi atingido. Tente novamente mais tarde.';
  if (status !== undefined && status >= 500) return fallback;
  if (!message || /erro http|unexpected token|syntaxerror|typeerror|stack trace|postgres|sqlstate|duplicate key|violates.*constraint|<html|<!doctype/i.test(message))
    return fallback;
  return message;
}
