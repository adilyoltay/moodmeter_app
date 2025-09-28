export type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export const ok = <T, E = never>(data: T): Result<T, E> => ({ ok: true, data });

export const err = <T = never, E = unknown>(error: E): Result<T, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; data: T } => result.ok === true;

export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => result.ok === false;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isErr(result)) {
    throw result.error;
  }
  return result.data;
};

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T => (
  isOk(result) ? result.data : fallback
);

export const mapResult = <T, E, U>(
  result: Result<T, E>,
  mapper: (data: T) => U,
): Result<U, E> => (
  isOk(result) ? ok<U, E>(mapper(result.data)) : result
);

export const mapError = <T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => F,
): Result<T, F> => (
  isErr(result) ? err<T, F>(mapper(result.error)) : result
);

export default Result;
