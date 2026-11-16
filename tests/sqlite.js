// Execute the application's SQL against a fresh, in-memory SQLite database.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

exports.openDatabaseSync = () => {
  const connection = new DatabaseSync(':memory:');
  return {
    execSync: sql => connection.exec(sql),
    runSync: (sql, params = []) => connection.prepare(sql).run(...params),
    getFirstSync: (sql, params = []) => connection.prepare(sql).get(...params) ?? null,
    getAllSync: (sql, params = []) => connection.prepare(sql).all(...params),
    closeSync: () => connection.close(),
  };
};
