export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
