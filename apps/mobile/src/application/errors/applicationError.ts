export type ApplicationErrorKind =
  | 'offline'
  | 'validation'
  | 'unauthorized'
  | 'unavailable'
  | 'unexpected';

export type ApplicationError = {
  readonly kind: ApplicationErrorKind;
  readonly message: string;
};
