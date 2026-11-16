const { createHash, randomUUID } = require('node:crypto');
exports.CryptoDigestAlgorithm = { SHA256: 'sha256' };
exports.digestStringAsync = async (algorithm, value) => createHash(algorithm).update(value).digest('hex');
exports.randomUUID = randomUUID;
