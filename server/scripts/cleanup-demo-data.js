/* eslint-disable no-console */
require('dotenv').config({ path: `${__dirname}/../.env` });

const readline = require('readline');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Activity = require('../models/Activity');
const User = require('../models/User');

function assertSafeEnvironment() {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error('[ABORT] cleanup-demo-data bloqueado: NODE_ENV=production');
    process.exit(1);
  }
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });
}

async function connectDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurada.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
}

async function run() {
  assertSafeEnvironment();
  await connectDb();

  const counts = {
    posts: await Post.countDocuments({}),
    reports: await Report.countDocuments({}),
    activity: await Activity.countDocuments({}),
    usersNonAdmin: await User.countDocuments({ role: { $nin: ['administrador'] } })
  };

  console.log('[PREVIEW] Registros detectados para limpieza:');
  console.log(`- posts: ${counts.posts}`);
  console.log(`- reports: ${counts.reports}`);
  console.log(`- activity: ${counts.activity}`);
  console.log(`- users NO admin (opcionales): ${counts.usersNonAdmin}`);
  console.log('');

  const confirmMain = await ask('Escribe DELETE_DEMO para borrar posts/replies/reports/activity: ');
  if (confirmMain !== 'DELETE_DEMO') {
    console.log('[CANCELADO] No se aplicaron cambios.');
    await mongoose.disconnect();
    return;
  }

  // replies están embebidas en Post; se limpian al eliminar posts.
  const repliesClearResult = await Post.updateMany({}, { $set: { replies: [] } });
  const postsDeleteResult = await Post.deleteMany({});
  const reportsDeleteResult = await Report.deleteMany({});
  const activityDeleteResult = await Activity.deleteMany({});

  console.log('[OK] Limpieza de contenido completada:');
  console.log(`- replies limpiadas (posts modificados): ${repliesClearResult.modifiedCount || 0}`);
  console.log(`- posts borrados: ${postsDeleteResult.deletedCount || 0}`);
  console.log(`- reports borrados: ${reportsDeleteResult.deletedCount || 0}`);
  console.log(`- activity borrada: ${activityDeleteResult.deletedCount || 0}`);

  const confirmUsers = await ask(
    "¿Borrar también usuarios NO admin? Escribe DELETE_USERS para confirmar (o Enter para omitir): "
  );

  if (confirmUsers === 'DELETE_USERS') {
    const usersDeleteResult = await User.deleteMany({ role: { $nin: ['administrador'] } });
    console.log(`[OK] Usuarios NO admin borrados: ${usersDeleteResult.deletedCount || 0}`);
  } else {
    console.log('[SKIP] Usuarios NO admin conservados.');
  }

  await mongoose.disconnect();
  console.log('[DONE] cleanup-demo-data finalizado.');
}

run().catch(async (error) => {
  console.error('[ERROR] cleanup-demo-data:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});

