export class MESSAGE {
  static ROUTES = {
    LOGIN: 'Logado com sucesso!',
    VALIDATE_TOKEN: 'Token de acesso validado com sucesso!',
    REFRESH_TOKEN: 'Token de acesso atualizado com sucesso!',
    SEND_RECOVER_EMAIL: 'Email de recuperação de conta enviado com sucesso!',
    CONFIRM_RECOVER_EMAIL: 'Nova senha criada com sucesso!'
  };

  static RESPONSE = {
    NOT_AUTHORIZED: 'Não autorizado.',
  };

  static EXCEPTION = {
    INVALID_TOKEN: 'Token inválido.',
    TOKEN_NOT_SET: 'Nenhum token foi solicitado para esse e-mail.',
    NOT_AUTHENTICATED: 'Você não está autenticado.',
    NOT_AUTHORIZED: 'Você não está autorizado.',
    FORBIDDEN: 'Você não possui acesso a este recurso.',
    TOO_MANY_REQUESTS: 'Você já fez muitas requisições! Aguarde um pouco.',
  };

  static MAIL = {
    RECOVER_MAIL_SUBJECT: 'Esqueceu sua senha?',
  };
}
