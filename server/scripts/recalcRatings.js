require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const { recalcPostRatings } = require('../utils/ratings');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const cursor = Post.find({ isDeleted: false }).cursor();
  let processed = 0;

  for await (const post of cursor) {
    recalcPostRatings(post);
    await post.save();
    processed += 1;
  }

  console.log(`Ratings recalculados en ${processed} posts`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Error recalculando ratings:', error);
  process.exit(1);
});
