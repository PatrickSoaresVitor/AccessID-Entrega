let adminAutenticado = false;

export function iniciarSessaoAdmin() {
  adminAutenticado = true;
}

export function encerrarSessaoAdmin() {
  adminAutenticado = false;
}

export function sessaoAdminAtiva() {
  return adminAutenticado;
}