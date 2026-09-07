export interface AuthenticatedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends LoginCredentials {
  first_name: string;
  last_name: string;
  matricula: string;
  programa_doctoral: string;
  cohorte: string;
}

export interface LoginResponse extends AuthenticatedUser {
  token: string;
}
