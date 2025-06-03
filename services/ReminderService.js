class ReminderService {
  constructor(db) {
    this.pool = db.getPool();
  }

  async getAllRemedios() {
    const result = await this.pool.query('SELECT * FROM remedios');
    console.log("result",result.rows);
    return result.rows;
  }

  async getRemediosByChatId(chatId){
    const result = await this.pool.query('SELECT * FROM remedios WHERE chat_id = ($1)',[chatId]);
    return result.rows;
  }

  async addRemedio(chat_id, nome, horario) {
    return await this.pool.query(
      'INSERT INTO remedios (chat_id, nome, horario) VALUES ($1, $2, $3)',
      [chat_id, nome, horario]
    );
  }

  async deleteRemedioById(id){
    await this.pool.query(
      'DELETE FROM remedios where id = ($1)',
      [id]
    );
  }

  async deleteAllRemediosByChatId(chatId){
    await this.pool.query(
      'DELETE FROM remedios where chat_id = ($1)',
      [chatId]
    );
  }
}

module.exports = ReminderService;
