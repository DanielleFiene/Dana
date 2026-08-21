/**
 * One SAIH observation, source-agnostic.
 * fecha is ISO UTC. estado is a source quality flag; Hidrosur has none (null).
 */
export type SaihPoint = {
  fecha: string;
  valor: number | null;
  estado: number | null;
};
