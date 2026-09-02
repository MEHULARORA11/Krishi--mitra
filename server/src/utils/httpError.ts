export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export const httpError = (statusCode: number, message: string) => new HttpError(statusCode, message)
