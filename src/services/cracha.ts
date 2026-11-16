const prefixo = 'ACCESSID:';

export function conteudoCracha(matricula: string) {
  return prefixo + matricula;
}

export function matriculaDoCracha(conteudo: string) {
  if (!conteudo.startsWith(prefixo)) return null;
  const matricula = conteudo.slice(prefixo.length);
  return matricula && matricula === matricula.trim() && !/[\r\n]/.test(matricula)
    ? matricula : null;
}
