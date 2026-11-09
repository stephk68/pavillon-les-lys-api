/** Taille de page maximale acceptée par les listes de l'API. */
export const MAX_PAGE_SIZE = 100;

/**
 * Normalise skip / take venant de la query string : NaN ou négatif → défaut,
 * take borné à MAX_PAGE_SIZE (avant : ?take=1000000 chargeait toute la base).
 */
export function pageParams(
  skip?: number,
  take?: number,
  defaultTake = 50,
): { skip: number; take: number } {
  const s = Number.isFinite(skip) && (skip as number) > 0 ? Math.floor(skip as number) : 0;
  const t =
    Number.isFinite(take) && (take as number) > 0
      ? Math.min(Math.floor(take as number), MAX_PAGE_SIZE)
      : defaultTake;
  return { skip: s, take: t };
}
