export const REPUTATION_RANKS = [
  { min: 0, max: 0, name: 'Silencio' },
  { min: 1, max: 50, name: 'Primeras palabras' },
  { min: 51, max: 200, name: 'Aprendiz del foro' },
  { min: 201, max: 600, name: 'Voz constante' },
  { min: 601, max: 1400, name: 'Aporta valor' },
  { min: 1401, max: 3000, name: 'Referente' },
  { min: 3001, max: 6000, name: 'Veterania' },
  { min: 6001, max: 12000, name: 'Pilar de la comunidad' },
  { min: 12001, max: Number.POSITIVE_INFINITY, name: 'Leyenda' }
];

export const getReputationRankInfo = (reputation = 0) => {
  const safeReputation = Number.isFinite(Number(reputation)) ? Number(reputation) : 0;
  const rank = REPUTATION_RANKS.find((item) => safeReputation >= item.min && safeReputation <= item.max) || REPUTATION_RANKS[0];

  if (!Number.isFinite(rank.max)) {
    return {
      name: rank.name,
      min: rank.min,
      max: rank.max,
      progressCurrent: safeReputation - rank.min,
      progressTotal: 1,
      progressPercent: 100,
      displayProgress: `${safeReputation} +`
    };
  }

  const progressCurrent = Math.max(0, safeReputation - rank.min + (safeReputation > 0 ? 1 : 0));
  const progressTotal = Math.max(1, rank.max - rank.min + 1);
  const progressPercent = Math.max(0, Math.min(100, Math.round((progressCurrent / progressTotal) * 100)));

  return {
    name: rank.name,
    min: rank.min,
    max: rank.max,
    progressCurrent,
    progressTotal,
    progressPercent,
    displayProgress: `${progressCurrent}/${progressTotal}`
  };
};
