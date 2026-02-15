const Post = require('../models/Post');
const Report = require('../models/Report');

const computeQualityScore = ({ votesUp = 0, votesDown = 0, reportsOpenCount = 0, reportsApprovedCount = 0 }) => {
  const netVotes = Number(votesUp || 0) - Number(votesDown || 0);
  const openPenalty = 3 * Number(reportsOpenCount || 0);
  const approvedPenalty = 15 * Number(reportsApprovedCount || 0);
  const bonus = netVotes > 0 && Number(reportsOpenCount || 0) === 0 && Number(reportsApprovedCount || 0) === 0 ? 2 : 0;
  return netVotes - openPenalty - approvedPenalty + bonus;
};

const recalculatePostQuality = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) return null;

  const votesUp = Array.isArray(post.votes?.upvotes) ? post.votes.upvotes.length : Number(post.votesUp || 0);
  const votesDown = Array.isArray(post.votes?.downvotes) ? post.votes.downvotes.length : Number(post.votesDown || 0);

  const [reportsOpenCount, reportsApprovedCount] = await Promise.all([
    Report.countDocuments({ postId: post._id, status: 'open' }),
    Report.countDocuments({ postId: post._id, status: 'approved' })
  ]);

  const qualityScore = computeQualityScore({ votesUp, votesDown, reportsOpenCount, reportsApprovedCount });

  post.votesUp = votesUp;
  post.votesDown = votesDown;
  post.reportsOpenCount = reportsOpenCount;
  post.reportsApprovedCount = reportsApprovedCount;
  post.qualityScore = qualityScore;
  post.flags = {
    hasOpenReports: reportsOpenCount > 0,
    hasApprovedReports: reportsApprovedCount > 0
  };

  await post.save();
  return post;
};

module.exports = {
  computeQualityScore,
  recalculatePostQuality
};
