require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const Database = require('./db/Database');
const ReminderService = require('./services/ReminderService');
const MenuService = require('./services/MenuService');
const helpers = require('./helper/helpers');

class Bot{
    constructor() {
        this.cadastroEstado = {};
        this.lembretesCron = {};
        this.db = new Database();
        this.db.init();
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.reminder = new ReminderService(this.db);
        this.menu = new MenuService(this.reminder,this.cadastroEstado,this.lembretesCron);
        this.cron = cron;
    }

    init(){
        this.startCron();
        this.bot.start((ctx) => {
            this.menu.menuInicial(ctx);
        });
        this.bot.on('callback_query', (ctx) => {
            this.menu.processaResposta(ctx);
        });
        this.bot.on('text', (ctx) => this.receivedText(ctx)); 
        this.bot.launch();
    }

    async startCron() {
        const remedios = await this.reminder.getAllRemedios();
        remedios.forEach(r => {
            const [hora, minuto] = r.horario.split(':');
            const job = this.cron.schedule(`${minuto} ${hora} * * *`, () => {
                this.bot.telegram.sendMessage(r.chat_id, `💊 VAI TOMAR O REMÉDIO: <b>"${r.nome}"</b> TA NA HORA!!!! ⏱❤️`,{ parse_mode: 'HTML' });
            });
            this.lembretesCron[r.id] = job;
        });
    }   


receivedText(ctx) {
    const estado = this.cadastroEstado[ctx.chat.id];
    if (!estado) {
        this.menu.menuInicial(ctx);
        return;
    }

    if (estado.etapa === 'esperando_nome') {
        estado.nome = ctx.message.text;
        estado.etapa = 'esperando_horarios';
        ctx.reply('⏰ Quais os horários? (ex: 08:00, 14:00 ou 2:00 PM)');
    } else if (estado.etapa === 'esperando_horarios') {
        const horariosInput = ctx.message.text.split(',');
        let validos = [];
        let invalidos = [];

        horariosInput.forEach(h => {
        const horario = helpers.parseHorario(h);
        if (horario) {
            const [hora, minuto] = horario.split(':');

            const result = this.reminder.addRemedio(ctx.chat.id,estado.nome,horario);
            const id = result.lastInsertRowid;

            const job = this.cron.schedule(`${minuto} ${hora} * * *`, () => {
                this.bot.telegram.sendMessage(ctx.chat.id, `💊 VAI TOMAR O REMÉDIO: <b>"${estado.nome}"</b> TA NA HORA!!!! ⏱❤️`,{ parse_mode: 'HTML' });
            });
            this.lembretesCron[id] = job;
            validos.push(horario);
        } else {
            invalidos.push(h.trim());
        }
        });

        if (validos.length > 0) {
            ctx.reply(`✅ Remédio "${estado.nome}" cadastrado com horários: ${validos.join(', ')}`);
        }
        if (invalidos.length > 0) {
            ctx.reply(`⚠️ Horários inválidos ignorados: ${invalidos.join(', ')}`);
        }

        delete this.cadastroEstado[ctx.chat.id];
    }
};
}
module.exports = Bot;