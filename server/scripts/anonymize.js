/* eslint-disable no-console */
require('dotenv').config({ path: `${__dirname}/../.env` });

const readline = require('readline');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const ResourceSubmission = require('../models/ResourceSubmission');

const askConfirmation = () => new Promise((resolve) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Escribe ANONYMIZE_DATA para anonimizar datos sensibles: ", (answer) => {
    rl.close();
    resolve(answer);
  });
});

const maskEmail = (value) => {
  if (!value || !String(value).includes('@')) return undefined;
  const [name, domain] = String(value).split('@');
  const safeName = `${name.slice(0, 1)}***`;
  return `${safeName}@${domain}`;
};

const maskPhone = (value) => {
  const raw = String(value || '').replace(/\D/g, '');
  if (!raw) return undefined;
  return `${'*'.repeat(Math.max(raw.length - 2, 0))}${raw.slice(-2)}`;
};

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurada.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const reports = await Report.find({}).select('_id reporter meta metadata');
  const resources = await ResourceSubmission.find({}).select('_id email phone meta');

  console.log(`Reportes a anonimizar: ${reports.length}`);
  console.log(`Recursos a anonimizar: ${resources.length}`);

  const confirmation = await askConfirmation();
  if (confirmation !== 'ANONYMIZE_DATA') {
    console.log('Operación cancelada. No se aplicaron cambios.');
    await mongoose.disconnect();
    return;
  }

  for (const report of reports) {
    if (report.reporter) {
      report.reporter.name = report.reporter.name ? 'Anonimo' : undefined;
      report.reporter.email = maskEmail(report.reporter.email);
      report.reporter.phone = maskPhone(report.reporter.phone);
    }
    if (report.meta) {
      report.meta.ip = report.meta.ip ? '0.0.0.0' : undefined;
      report.meta.userAgent = report.meta.userAgent ? 'redacted' : undefined;
    }
    if (report.metadata) {
      report.metadata.ip = report.metadata.ip ? '0.0.0.0' : undefined;
      report.metadata.userAgent = report.metadata.userAgent ? 'redacted' : undefined;
    }
    await report.save();
  }

  for (const resource of resources) {
    resource.email = maskEmail(resource.email);
    resource.phone = maskPhone(resource.phone);
    if (resource.meta) {
      resource.meta.ip = resource.meta.ip ? '0.0.0.0' : undefined;
      resource.meta.userAgent = resource.meta.userAgent ? 'redacted' : undefined;
    }
    await resource.save();
  }

  console.log('Anonimización completada.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Error en anonymize:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});

