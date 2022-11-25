export class TEMPLATE {
  static ROUTES = {
    CREATE: (route: string, gender: string) => `${route} criad${gender} com sucesso!`,
    FIND_ONE: (route: string, gender: string) => `${route} recuperad${gender} com sucesso!`,
    FIND_ALL: (route: string, gender: string) => `${route} recuperad${gender}s com sucesso!`,
    UPDATE: (route: string, gender: string) => `${route} atualizad${gender} com sucesso!`,
    REMOVE: (route: string, gender: string) => `${route} removid${gender} com sucesso!`,
    BULK_CREATE: (route: string, gender: string) => `${route} criad${gender}s com sucesso!`,
    BULK_REMOVE: (route: string, gender: string) => `${route} removid${gender}s com sucesso!`,
    RESTORE: (route: string, gender: string) => `${route} restaurad${gender}s com sucesso!`,
    CLEAN: (route: string, gender: string) => `${route} zerad${gender}s com sucesso!`,
    HARD_REMOVE: (route: string, gender: string) => `${route} removid${gender}s permanentemente com sucesso!`
  };

  static VALIDATION = {
    IS_PHONE_NUMBER: (prop: string) => `${prop} deve ser um telefone válido.`,
    IS_NOT_EMPTY: (prop: string) => `${prop} é obrigatório.`,
    IS_EMAIL: (prop: string) => `${prop} deve ser um e-mail válido.`,
    MIN_LENGTH: (prop: string, value: number) =>
      `${prop} deve ter o tamanho mínimo de ${value} caracteres ou items.`,
    MAX_LENGTH: (prop: string, value: number) =>
      `${prop} deve ter o tamanho máximo de ${value} caracteres ou items.`,
    IS_IN: (prop: string, values: Readonly<string[]>) =>
      `${prop} deve ser um dos seguintes valores: ${values.join(', ')}.`,
    IS_DATE_STRING: (prop: string) => `${prop} deve ser uma data válida. Ex.: aaaa-mm-dd.`,
    IS_NUMBER: (prop: string) => `${prop} deve ser um número válido.`,
    IS_NUMBER_STRING: (prop: string) => `${prop} deve ser um número em texto válido.`,
    IS_MILITARY_TIME: (prop: string) => `${prop} deve ser um horário válido. Ex.: HH:MM.`,
    IS_ARRAY: (prop: string) => `${prop} deve ser uma matriz válida.`,
    ARRAY_MAX_SIZE: (prop: string, value: number) => `${prop} deve ser menor ou igual a ${value}.`,
    ARRAY_MIN_SIZE: (prop: string, value: number) => `${prop} deve ser maior ou igual a ${value}.`,
    IS_DECIMAL: (prop: string) => `${prop} deve ser um decimal válido. Ex.: 1.5.`,
    IS_STRING: (prop: string) => `${prop} deve ser um texto válido.`,
    IS_OBJECT: (prop: string) => `${prop} deve ser um objeto JSON.`,
    IS_BOOLEAN: (prop: string) => `${prop} deve ser um boleano.`,
    ARRAY_NOT_EMPTY: (prop: string) => `${prop} não pode ser uma matriz vazia.`,
    MIN: (prop: string, value: number) => `${prop} deve ser maior ou igual a ${value}.`,
    MAX: (prop: string, value: number) => `${prop} deve ser menor ou igual a ${value}.`,
    IS_URL: (prop: string) => `${prop} deve ser uma URL válida.`,
    IS_NOT_EMPTY_OBJECT: (prop: string) => `${prop} não pode ser um objeto vazio.`,
    IS_ENUM: (prop: string, values: string[]) =>
      `${prop} deve ser um dos seguintes valores: ${values}.`,
    IS_INT: (prop: string) => `${prop} deve ser um inteiro válido.`,
    IS_UUID: (prop: string) => `${prop} deve ser um UUID válido.`
  };

  static EXCEPTION = {
    NOT_FOUND: (name: string, gender: string) =>
      `${gender.toUpperCase()} ${name} não foi encontrad${gender}.`,
    CONFLICT: (name: string, gender: string) =>
      `${gender.toUpperCase} ${name} já está sendo utilizad${gender}.`,
    FILE_SIZE_EXCEEDS: (maxSize: number) =>
      `O tamanho do arquivo excede o máximo de ${maxSize / 1024 / 1024} Mb.`,
    FILES_SIZE_EXCEEDS: (maxSize: number) =>
      `O tamanho de um dos arquivos excede o máximo de ${maxSize / 1024 / 1024} Mb.`,
  };

  static MAIL = {
    RECOVER_MAIL_URL: (domain: string, email: string, token: string) =>
      `${domain}/painel/recuperar-conta?email=${email}&token=${token}`,
  };

  static PIPES = {
    MAX_FILES_SIZE: (maxSize: number) =>
      `Falha na validação (tamanho esperado é maior que ${maxSize})`,
    FILES_TYPE: (fileType: string | RegExp) => `Falha na validação (tipo esperado é ${fileType})`,
  };
}
