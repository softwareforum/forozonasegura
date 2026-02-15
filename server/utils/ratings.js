const isValidRatingValue = (value) => Number.isFinite(value) && value >= 1 && value <= 5;

const toOneDecimal = (value) => Math.round(value * 10) / 10;

const extractRatingSamples = (postDoc) => {
  const samples = [];

  const postConfort = Number(postDoc?.experiencia?.confort);
  const postSeguridad = Number(postDoc?.experiencia?.seguridadPercibida);
  if (isValidRatingValue(postConfort) && isValidRatingValue(postSeguridad)) {
    samples.push({ confort: postConfort, seguridad: postSeguridad });
  }

  const replies = Array.isArray(postDoc?.replies) ? postDoc.replies : [];
  replies
    .filter((reply) => !reply?.isDeleted)
    .forEach((reply) => {
      const confort = Number(reply?.experiencia?.confort);
      const seguridad = Number(reply?.experiencia?.seguridadPercibida);
      if (isValidRatingValue(confort) && isValidRatingValue(seguridad)) {
        samples.push({ confort, seguridad });
      }
    });

  return samples;
};

const recalcPostRatings = (postDoc) => {
  const samples = extractRatingSamples(postDoc);
  const count = samples.length;

  if (count === 0) {
    postDoc.ratings = {
      count: 0,
      avgConfort: 0,
      avgSeguridad: 0,
      avgGlobal: 0
    };
    return postDoc.ratings;
  }

  const confortTotal = samples.reduce((acc, sample) => acc + sample.confort, 0);
  const seguridadTotal = samples.reduce((acc, sample) => acc + sample.seguridad, 0);
  const avgConfort = toOneDecimal(confortTotal / count);
  const avgSeguridad = toOneDecimal(seguridadTotal / count);
  const avgGlobal = toOneDecimal((avgConfort + avgSeguridad) / 2);

  postDoc.ratings = {
    count,
    avgConfort,
    avgSeguridad,
    avgGlobal
  };
  return postDoc.ratings;
};

module.exports = {
  recalcPostRatings
};
