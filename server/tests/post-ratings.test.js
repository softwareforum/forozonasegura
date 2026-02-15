const { recalcPostRatings } = require('../utils/ratings');

describe('Post ratings aggregation', () => {
  test('post with 5/5 sets avgGlobal=5 count=1', () => {
    const post = {
      experiencia: { confort: 5, seguridadPercibida: 5 },
      replies: []
    };

    const ratings = recalcPostRatings(post);
    expect(ratings.count).toBe(1);
    expect(ratings.avgConfort).toBe(5);
    expect(ratings.avgSeguridad).toBe(5);
    expect(ratings.avgGlobal).toBe(5);
  });

  test('post 5/5 + reply 1/1 sets avgGlobal=3 count=2', () => {
    const post = {
      experiencia: { confort: 5, seguridadPercibida: 5 },
      replies: [
        {
          isDeleted: false,
          experiencia: { confort: 1, seguridadPercibida: 1 }
        }
      ]
    };

    const ratings = recalcPostRatings(post);
    expect(ratings.count).toBe(2);
    expect(ratings.avgConfort).toBe(3);
    expect(ratings.avgSeguridad).toBe(3);
    expect(ratings.avgGlobal).toBe(3);
  });
});
