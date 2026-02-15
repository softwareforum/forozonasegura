require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const Post = require('../models/Post');
const { recalculatePostQuality } = require('../utils/postQuality');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no configurada');
  }

  await mongoose.connect(uri);
  try {
    const posts = await Post.find({}, { _id: 1 }).lean();
    for (const post of posts) {
      await recalculatePostQuality(post._id);
    }
    console.log(`Recalculados ${posts.length} posts`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Error recalculando qualityScore:', error.message);
  process.exit(1);
});
