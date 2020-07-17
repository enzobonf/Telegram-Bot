const TelegramBot = require('node-telegram-bot-api');
const rp = require('request-promise').defaults({jar: true, simple: false});;
const nodeHtmlToImage = require('node-html-to-image');

require('dotenv').config();
 
//trocar no arquivo .env
const token = process.env.TELEGRAM_TOKEN;
const urlComissoes = process.env.URL_COMISSOES;
//const tokenComissoes = process.env.TOKEN_COMISSOES;

const bot = new TelegramBot(token, {polling: true});

function authComissoes(){

    return new Promise((resolve, reject)=>{

        let options = {
            uri: `http://${urlComissoes}/login`,
            method: 'POST',
            body: {
                user: process.env.USER_COMISSOES,
                password: process.env.PASS_COMISSOES
            },
            headers: {},
            json: true
        };

        rp(options).then(response=>{
            resolve(response);
        }).catch(err=>{
            reject(err);
        })

    });

}

bot.onText(/\/echo (.+)/, (msg, match)=>{

    const chatId = msg.chat.id;
    const resp = match[1];
 
    bot.sendMessage(chatId, resp);

});

bot.onText(/\/sendmail/, async (msg)=>{

    const chatId = msg.chat.id;

    if(msg.from.id != '1380249007') return bot.sendMessage(chatId, 'Sem permissão!');

    bot.sendMessage(chatId, 'Processando...');

    try{
        await authComissoes();
    } 
    catch(err){
        return bot.sendMessage(chatId, `Algo deu errado: ${err}`);
    }

    var options = {
        uri: `http://${urlComissoes}/send`,
        qs: { 
            noView: '' // -> uri + '?access_token=xxxxx%20xxxxx'
        },
        headers: {
            'User-Agent': 'Request-Promise',
        },
        json: true
    };

    rp(options).then(json=>{
        
        let message = json.message;
        if(json.somaComissoes) message = message + `\nHá R$ ${json.somaComissoes} em comissões atrasadas.`;

        let output = './image.png';

        bot.sendMessage(chatId, message);
        bot.sendMessage(chatId, 'Gerando imagem...')

        nodeHtmlToImage({
            puppeteerArgs:[
                '--no-sandbox'
            ],
            output,
            html: json.table
        })
        .then(() => {
            console.log('Imagem da tabela gerada com sucesso!')
            bot.sendPhoto(chatId, output);
        }).catch(err=>{
            bot.sendMessage(chatId, 'Erro ao gerar a imagem');
        });        
        
    }).catch(err=>{
        bot.sendMessage(chatId, `Algo deu errado: ${err}`);
    });


});