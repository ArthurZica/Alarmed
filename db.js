const Database = require('better-sqlite3');
const db = new Database('remedios.db');

// Cria tabela se não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS remedios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    nome TEXT,
    horario TEXT
  )
`).run();

module.exports = db;
