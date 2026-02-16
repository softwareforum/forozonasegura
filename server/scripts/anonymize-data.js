/* eslint-disable no-console */
require('dotenv').config({ path: `${__dirname}/../.env` });

const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const ResourceSubmission = require('../models/ResourceSubmission');

const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;

function assertSafeEnvironment() {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error('[ABORT] anonymize-data bloqueado: NODE_ENV=production');
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

function redactIfSensitive(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return text;
  if (EMAIL_REGEX.test(text) || PHONE_REGEX.test(text)) {
    return '[redacted]';
  }
  return text;
}

function userEmailFromId(id) {
  return `user_${String(id)}@example.com`;
}

function userNameFromId(id) {
  return `user_${String(id).slice(-8)}`;
}

async function connectDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurada.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
}

async function anonymizeUsers() {
  const users = await User.find({}).select('_id email username');
  let changed = 0;
  for (const user of users) {
    user.email = userEmailFromId(user._id);
    user.username = userNameFromId(user._id);
    await user.save();
    changed += 1;
  }
  return changed;
}

async function anonymizePosts() {
  const posts = await Post.find({});
  let changed = 0;

  for (const post of posts) {
    const original = JSON.stringify(post.toObject());

    post.title = redactIfSensitive(post.title);
    post.content = redactIfSensitive(post.content);
    post.street = redactIfSensitive(post.street);

    if (post.location) {
      post.location.municipioZona = redactIfSensitive(post.location.municipioZona);
      post.location.calleAproximada = redactIfSensitive(post.location.calleAproximada);
      if (post.location.geo) {
        post.location.geo.label = redactIfSensitive(post.location.geo.label);
      }
    }

    if (post.servicios) {
      post.servicios.otrosDetalles = redactIfSensitive(post.servicios.otrosDetalles);
    }
    if (post.anfitrion) {
      post.anfitrion.comentario = redactIfSensitive(post.anfitrion.comentario);
    }
    if (post.experiencia) {
      post.experiencia.descripcion = redactIfSensitive(post.experiencia.descripcion);
    }

    if (Array.isArray(post.replies)) {
      post.replies = post.replies.map((reply) => ({
        ...reply.toObject?.() || reply,
        content: redactIfSensitive(reply.content)
      }));
    }

    const updated = JSON.stringify(post.toObject());
    if (original !== updated) {
      await post.save();
      changed += 1;
    }
  }

  return changed;
}

async function anonymizeReports() {
  const reports = await Report.find({});
  let changed = 0;

  for (const report of reports) {
    report.message = redactIfSensitive(report.message);

    if (report.reporter) {
      report.reporter.email = report.reporter.email ? userEmailFromId(report._id) : undefined;
      report.reporter.name = report.reporter.name ? `user_${String(report._id).slice(-8)}` : undefined;
      report.reporter.phone = null;
    }

    await report.save();
    changed += 1;
  }

  return changed;
}

async function anonymizeResources() {
  const resources = await ResourceSubmission.find({});
  let changed = 0;

  for (const resource of resources) {
    resource.entityName = redactIfSensitive(resource.entityName);
    resource.description = redactIfSensitive(resource.description);
    resource.website = redactIfSensitive(resource.website);
    resource.email = resource.email ? userEmailFromId(resource._id) : undefined;
    resource.phone = null;
    await resource.save();
    changed += 1;
  }

  return changed;
}

async function run() {
  assertSafeEnvironment();
  await connectDb();

  const preview = {
    users: await User.countDocuments({}),
    posts: await Post.countDocuments({}),
    reports: await Report.countDocuments({}),
    resources: await ResourceSubmission.countDocuments({})
  };

  console.log('[PREVIEW] Registros a anonimizar:');
  console.log(`- users: ${preview.users}`);
  console.log(`- posts: ${preview.posts}`);
  console.log(`- reports: ${preview.reports}`);
  console.log(`- resources: ${preview.resources}`);
  console.log('');

  const confirm = await ask('Escribe ANONYMIZE_DATA para continuar: ');
  if (confirm !== 'ANONYMIZE_DATA') {
    console.log('[CANCELADO] No se aplicaron cambios.');
    await mongoose.disconnect();
    return;
  }

  const result = {
    users: await anonymizeUsers(),
    posts: await anonymizePosts(),
    reports: await anonymizeReports(),
    resources: await anonymizeResources()
  };

  console.log('[DONE] Anonimización completada.');
  console.log(`- users anonimizados: ${result.users}`);
  console.log(`- posts anonimizados: ${result.posts}`);
  console.log(`- reports anonimizados: ${result.reports}`);
  console.log(`- resources anonimizados: ${result.resources}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('[ERROR] anonymize-data:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});

