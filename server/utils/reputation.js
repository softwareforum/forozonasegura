const User = require('../models/User');

const POINTS = {
  post_create: 3,
  reply_create: 1,
  post_upvote_received: 4,
  reply_upvote_received: 2,
  report_approved: 5
};

const LIMITS = {
  dailyPostCountedMax: 10,
  dailyReplyCountedMax: 10,
  dailyActivityPointsMax: 30,
  weeklyApprovedReportsMax: 5
};

const RANKS = [
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

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getWeekKey = (date = new Date()) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const ensureCounters = (user) => {
  if (!user.dailyCounters) {
    user.dailyCounters = {
      dayKey: getDateKey(),
      postsCounted: 0,
      repliesCounted: 0,
      activityPoints: 0
    };
  }

  if (!user.weeklyCounters) {
    user.weeklyCounters = {
      weekKey: getWeekKey(),
      approvedReportsCounted: 0
    };
  }

  const dayKey = getDateKey();
  if (user.dailyCounters.dayKey !== dayKey) {
    user.dailyCounters.dayKey = dayKey;
    user.dailyCounters.postsCounted = 0;
    user.dailyCounters.repliesCounted = 0;
    user.dailyCounters.activityPoints = 0;
  }

  const weekKey = getWeekKey();
  if (user.weeklyCounters.weekKey !== weekKey) {
    user.weeklyCounters.weekKey = weekKey;
    user.weeklyCounters.approvedReportsCounted = 0;
  }
};

const getRankInfo = (reputation = 0) => {
  const safeRep = Number.isFinite(Number(reputation)) ? Number(reputation) : 0;
  const rank = RANKS.find((item) => safeRep >= item.min && safeRep <= item.max) || RANKS[0];
  const progressMax = Number.isFinite(rank.max) ? rank.max : safeRep;
  const progressCurrent = safeRep - rank.min;
  const progressTotal = Number.isFinite(rank.max) ? Math.max(1, rank.max - rank.min + 1) : 1;
  const progressPercent = Number.isFinite(rank.max)
    ? Math.max(0, Math.min(100, Math.round((progressCurrent / progressTotal) * 100)))
    : 100;

  return {
    name: rank.name,
    min: rank.min,
    max: rank.max,
    progressCurrent,
    progressTotal,
    progressMax,
    progressPercent
  };
};

const applyCappedActivityDelta = (user, baseDelta, reason) => {
  if (baseDelta <= 0) return 0;

  if (reason === 'post_create') {
    if (user.dailyCounters.postsCounted >= LIMITS.dailyPostCountedMax) return 0;
    const remaining = LIMITS.dailyActivityPointsMax - user.dailyCounters.activityPoints;
    if (remaining <= 0) return 0;
    const applied = Math.min(baseDelta, remaining);
    user.dailyCounters.postsCounted += 1;
    user.dailyCounters.activityPoints += applied;
    return applied;
  }

  if (reason === 'reply_create') {
    if (user.dailyCounters.repliesCounted >= LIMITS.dailyReplyCountedMax) return 0;
    const remaining = LIMITS.dailyActivityPointsMax - user.dailyCounters.activityPoints;
    if (remaining <= 0) return 0;
    const applied = Math.min(baseDelta, remaining);
    user.dailyCounters.repliesCounted += 1;
    user.dailyCounters.activityPoints += applied;
    return applied;
  }

  if (reason === 'report_approved') {
    if (user.weeklyCounters.approvedReportsCounted >= LIMITS.weeklyApprovedReportsMax) return 0;
    user.weeklyCounters.approvedReportsCounted += 1;
    return baseDelta;
  }

  return baseDelta;
};

const updateReputation = async (userId, delta, reason, meta = {}) => {
  const user = await User.findById(userId);
  if (!user) return null;

  ensureCounters(user);

  let baseDelta = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  if (!baseDelta && POINTS[reason]) {
    baseDelta = POINTS[reason];
  }

  let appliedDelta = baseDelta;
  if (['post_create', 'reply_create', 'report_approved'].includes(reason)) {
    appliedDelta = applyCappedActivityDelta(user, baseDelta, reason);
  }

  if (appliedDelta !== 0) {
    user.reputation = Math.max(0, Number(user.reputation || 0) + appliedDelta);
    user.level = user.calculateLevel();
  }

  await user.save();

  return {
    appliedDelta,
    reputation: user.reputation,
    level: user.level,
    rank: getRankInfo(user.reputation),
    reason,
    meta
  };
};

const votePointsFor = (voteType, targetType) => {
  if (voteType !== 'upvote') return 0;
  return targetType === 'reply' ? POINTS.reply_upvote_received : POINTS.post_upvote_received;
};

const calculateVoteReputationDelta = ({ previousVote, nextVote, targetType }) => {
  const before = votePointsFor(previousVote, targetType);
  const after = votePointsFor(nextVote, targetType);
  return after - before;
};

module.exports = {
  POINTS,
  LIMITS,
  RANKS,
  getRankInfo,
  updateReputation,
  calculateVoteReputationDelta
};
