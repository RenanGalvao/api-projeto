export type FindAllResponse<T> = {
  data: T;
  totalCount: number;
  totalPages: number;
};

export type FileResponse = {
  name: string;
  mimeType: string;
  size: number;
  path: string;
};

export type Routes = {
  [key: string]: {
    singular: string;
    plural: string;
    gender: string;
  };
};
