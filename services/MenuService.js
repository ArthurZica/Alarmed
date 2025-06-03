class MenuService {
    constructor(reminder,cadastroEstado,lembretesCron) {
        this.reminder = reminder; 
        this.cadastroEstado = cadastroEstado;
        this.lembretesCron = lembretesCron;
    }

    menuInicial(ctx) {
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

    async menuDelete(ctx) {
        const remediosUsuario = await this.reminder.getRemediosByChatId(ctx.chat.id);
        if(remediosUsuario.length === 0){
            ctx.reply('📭 Você ainda não cadastrou nenhum remédio.');
            return;
        }
        
        const botoes = remediosUsuario.map((remedio) => {
            return [{ text: `${remedio.nome} - ${remedio.horario}`, callback_data: `deletar_${remedio.id}` }];
        });
        botoes.unshift([{text: 'Apagar Todos ❌',callback_data: `deletar_*`}]);
        ctx.reply('❌ Qual remédio deseja excluir?', {
            reply_markup: {
                inline_keyboard: botoes
            }
        });
    }

    async processaResposta(ctx){
        const data = ctx.callbackQuery.data;
        
        if (data === 'menu_cadastrar') {
            this.cadastroEstado[ctx.chat.id] = { etapa: 'esperando_nome' };
            ctx.reply('💊 Qual o nome do remédio?');
        }
    
        if (data === 'menu_listar') {
            const rows = await this.reminder.getRemediosByChatId(ctx.chat.id);
            console.log("rows",rows);
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
            this.menuDelete(ctx);
        }
    
        if(data.includes('deletar_')){
            const idRemedio = data.split('_')[1];
            console.log("idRemedio",idRemedio);
            if(idRemedio == '*'){
                await this.reminder.deleteAllRemediosByChatId(ctx.chat.id);
                ctx.reply('✅ Remédios excluído com sucesso.');
                this.menuInicial(ctx);
                ctx.answerCbQuery();
                return;
            }
            if (this.lembretesCron[idRemedio]) {
                this.lembretesCron[idRemedio].stop();
                delete this.lembretesCron[idRemedio];
                await this.reminder.deleteRemedioById(idRemedio);
                ctx.reply('✅ Remédio excluído com sucesso.');
                this.menuInicial(ctx);
                ctx.answerCbQuery();
                return;
            }   
        }
        ctx.answerCbQuery();
    }
}
module.exports = MenuService;