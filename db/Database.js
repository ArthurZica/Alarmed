const { Pool } = require('pg');
require('dotenv').config();
class Database {
  constructor() {
      this.pool = this.iniciaPool();
  }

  iniciaPool(){
    return new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.PGDATABASE,
    });
  }

  async init() {
    const query = `
      CREATE TABLE IF NOT EXISTS remedios (
        id SERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL,
        nome TEXT NOT NULL,
        horario TEXT NOT NULL
      );
    `;
    await this.pool.query(query);
  }

  getPool() {
    return this.pool;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
