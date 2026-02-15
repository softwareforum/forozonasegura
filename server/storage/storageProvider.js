const fs = require('fs');
const path = require('path');

const sanitizeFileName = (value) =>
  String(value || 'file')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);

class LocalStorageProvider {
  async saveFiles(files = [], { postId, reportId }) {
    const baseDir = path.join(__dirname, '..', 'uploads', 'reports', String(postId), String(reportId));
    fs.mkdirSync(baseDir, { recursive: true });

    return files.map((file) => {
      const safeName = sanitizeFileName(file.originalname);
      const finalName = `${Date.now()}_${safeName}`;
      const fullPath = path.join(baseDir, finalName);
      fs.writeFileSync(fullPath, file.buffer);

      const relativePath = path
        .relative(path.join(__dirname, '..', 'uploads'), fullPath)
        .replace(/\\/g, '/');

      return {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storage: 'local',
        pathOrUrl: `/uploads/${relativePath}`,
        publicUrl: null
      };
    });
  }
}

class S3StorageProvider {
  async saveFiles(_files = [], _context = {}) {
    // TODO: Implementar subida real a S3/Backblaze via SDK y devolver URLs firmadas/publicas.
    throw new Error('S3StorageProvider not implemented yet');
  }
}

const getStorageProvider = () => {
  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  if (driver === 's3') return new S3StorageProvider();
  return new LocalStorageProvider();
};

module.exports = {
  getStorageProvider,
  LocalStorageProvider,
  S3StorageProvider
};

