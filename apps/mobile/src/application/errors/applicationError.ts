// ApplicationErrorKind defines stable error categories that UI can map to states.
export type ApplicationErrorKind =
  | 'offline'
  | 'validation'
  | 'unauthorized'
  | 'unavailable'
  | 'unexpected';

// ApplicationError is the cross-layer error contract exposed by use cases.
export type ApplicationError = {
  // kind selects recovery behavior without parsing human-readable text.
  readonly kind: ApplicationErrorKind;
  // message is safe user-facing context for the current failure.
  readonly message: string;
};
