import { Routes } from 'src/utils/types';

export const routes = {
  log: {
    singular: 'Log',
    plural: 'Logs',
    gender: 'o',
  },
  user: {
    singular: 'Usuário',
    plural: 'Usuários',
    gender: 'o',
  },
  file: {
    singular: 'Arquivo',
    plural: 'Arquivos',
    gender: 'o',
  },
  volunteer: {
    singular: 'Voluntário',
    plural: 'Voluntários',
    gender: 'o',
  },
  field: {
    singular: 'Campo',
    plural: 'Campos',
    gender: 'o',
  },
  agenda: {
    singular: 'Event',
    plural: 'Eventos',
    gender: 'o'
  },
  'assisted-family': {
    singular: 'Família assistida',
    plural: 'Famílias assistidas',
    gender: 'a'
  }
} as Routes;
