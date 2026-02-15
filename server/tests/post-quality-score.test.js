jest.mock('../models/Post', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Report', () => ({
  countDocuments: jest.fn()
}));

const Post = require('../models/Post');
const Report = require('../models/Report');
const { computeQualityScore, recalculatePostQuality } = require('../utils/postQuality');

describe('Post quality score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('computeQualityScore formula base case with bonus', () => {
    const score = computeQualityScore({ votesUp: 5, votesDown: 2, reportsOpenCount: 0, reportsApprovedCount: 0 });
    expect(score).toBe(5); // (5-2) + bonus 2
  });

  test('open reports lower quality score', () => {
    const score = computeQualityScore({ votesUp: 5, votesDown: 1, reportsOpenCount: 2, reportsApprovedCount: 0 });
    expect(score).toBe(-2); // 4 - 6 + 0
  });

  test('approved reports strongly lower quality score', () => {
    const score = computeQualityScore({ votesUp: 8, votesDown: 2, reportsOpenCount: 1, reportsApprovedCount: 2 });
    expect(score).toBe(-27); // 6 -3 -30
  });

  test('more upvotes increase quality score', () => {
    const low = computeQualityScore({ votesUp: 1, votesDown: 0, reportsOpenCount: 0, reportsApprovedCount: 0 });
    const high = computeQualityScore({ votesUp: 4, votesDown: 0, reportsOpenCount: 0, reportsApprovedCount: 0 });
    expect(high).toBeGreaterThan(low);
  });

  test('recalculatePostQuality updates counters and flags', async () => {
    const postDoc = {
      _id: '507f1f77bcf86cd799439111',
      votes: { upvotes: ['u1', 'u2', 'u3'], downvotes: ['u4'] },
      save: jest.fn().mockResolvedValue()
    };

    Post.findById.mockResolvedValue(postDoc);
    Report.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const result = await recalculatePostQuality(postDoc._id);

    expect(result.votesUp).toBe(3);
    expect(result.votesDown).toBe(1);
    expect(result.reportsOpenCount).toBe(1);
    expect(result.reportsApprovedCount).toBe(2);
    expect(result.flags.hasOpenReports).toBe(true);
    expect(result.flags.hasApprovedReports).toBe(true);
    expect(typeof result.qualityScore).toBe('number');
    expect(postDoc.save).toHaveBeenCalled();
  });
});
