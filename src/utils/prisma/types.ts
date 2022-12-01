export type paginatedQueryOptions = {
  // TODO nested pattern
  include?: {
    [key: string]: { [key: string]: { [key: string]: boolean } } | boolean;
  };
  excludeKeys?: string[];
};
