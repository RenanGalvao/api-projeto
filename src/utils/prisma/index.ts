export class PrismaUtils {
  static exclude<T, Key extends keyof T>(model: T, ...keys: Key[]): Omit<T, Key> {
    if (!model) return model;

    for (const key of keys) {
      delete model[key];
    }
    return model;
  }

  static excludeMany<T, Key extends keyof T>(models: T[], ...keys: Key[]): Omit<T[], Key> {
    for (const model of models) {
      for (const key of keys) {
        delete model[key];
      }
    }
    return models;
  }
}
