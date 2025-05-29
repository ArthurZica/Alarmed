require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const db = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);
let cadastroEstado = {};
const lembretesCron = {};


// Funções auxiliares
function parseHorario(input) {
  const str = input.trim().toLowerCase().replace(/\s+/g, '');

  const match = str.match(/^(\d{1,2})(:(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const minute = match[3] ? parseInt(match[3]) : 0;
  const period = match[4];

  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function horarioValido(horario) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horario);
}

// Agendar lembretes existentes ao iniciar
const remedios = db.prepare('SELECT * FROM remedios').all();
remedios.forEach(r => {
    
  const [hora, minuto] = r.horario.split(':');
  const job = cron.schedule(`${minuto} ${hora} * * *`, () => {
    bot.telegram.sendMessage(r.chat_id, `💊 Lembrete: tome o remédio "${r.nome}"`);
  });

  lembretesCron[r.id] = job;
});

//Inicio
bot.start((ctx) => {
  menuInicial(ctx);
});

function menuInicial(ctx) {
  ctx.reply('👋 Olá! O que deseja fazer?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 Cadastrar remédio', callback_data: 'menu_cadastrar' }],
        [{ text: '📄 Listar remédios', callback_data: 'menu_listar' }],
        [{ text: '🗑 Excluir remédios', callback_data: 'menu_excluir' }]
      ]
    }
  });
}

function menuDelete(ctx) {
    const remediosUsuario = db.prepare('SELECT id, nome, horario FROM remedios WHERE chat_id = ?').all(ctx.chat.id);
    if(remediosUsuario.length === 0){
        ctx.reply('📭 Você ainda não cadastrou nenhum remédio.');
        return;
    }
    
    const botoes = remediosUsuario.map((remedio) => {
        return [{ text: `${remedio.nome} - ${remedio.horario}`, callback_data: `deletar_${remedio.id}` }];
    });
    ctx.reply('❌ Qual remédio deseja excluir?', {
    reply_markup: {
        inline_keyboard: botoes
    }
    });
}

// Menu de opções
bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === 'menu_cadastrar') {
    cadastroEstado[ctx.chat.id] = { etapa: 'esperando_nome' };
    ctx.reply('💊 Qual o nome do remédio?');
  }

  if (data === 'menu_listar') {
    const rows = db.prepare('SELECT nome, horario FROM remedios WHERE chat_id = ?').all(ctx.chat.id);

    if (rows.length === 0) {
      ctx.reply('📭 Você ainda não cadastrou nenhum remédio.');
    } else {
      let msg = '📋 Seus remédios:\n\n';
      rows.forEach(r => {
        msg += `• ${r.nome} às ${r.horario}\n`;
      });
      ctx.reply(msg);
    }
  }

  if(data == 'menu_excluir'){
    menuDelete(ctx);
  }

  if(data.includes('deletar_')){
    const idRemedio = data.split('_')[1];
    console.log(idRemedio,data);
     if (lembretesCron[idRemedio]) {
        lembretesCron[idRemedio].stop();
        delete lembretesCron[idRemedio];
    }
    db.prepare('DELETE FROM remedios WHERE id = ?').run(idRemedio);
    ctx.reply('✅ Remédio excluído com sucesso.');
    menuInicial(ctx);
  }

  ctx.answerCbQuery();
});

// Fluxo
bot.on('text', (ctx) => {
  const estado = cadastroEstado[ctx.chat.id];
  if (!estado) {
    menuInicial(ctx);
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
      const horario = parseHorario(h);
      if (horario) {
        const [hora, minuto] = horario.split(':');

        const result = db.prepare('INSERT INTO remedios (chat_id, nome, horario) VALUES (?, ?, ?)')
          .run(ctx.chat.id, estado.nome, horario);
        const id = result.lastInsertRowid;

        const job = cron.schedule(`${minuto} ${hora} * * *`, () => {
          bot.telegram.sendMessage(ctx.chat.id, `💊 VAI TOMA O REMÉDIO: "${estado.nome}" TA NA HORA!!!! ❤️`);
        });
        lembretesCron[id] = job;
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

    delete cadastroEstado[ctx.chat.id];
  }
});

bot.launch();
