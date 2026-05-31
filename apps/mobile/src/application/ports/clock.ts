// Clock abstracts current time so scheduling use cases stay deterministic in tests.
export type Clock = {
  // now returns the current timestamp source as a Date object.
  readonly now: () => Date;
};
