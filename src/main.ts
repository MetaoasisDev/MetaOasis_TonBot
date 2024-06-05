import dotenv from 'dotenv';
dotenv.config();

import { bot } from './bot';
import { walletMenuCallbacks } from './connect-wallet-menu';
import {
    handleConnectCommand,
    handleDisconnectCommand,
    handleSendTXCommand,
    handleShowMyWalletCommand
} from './commands-handlers';
import { initRedisClient } from './ton-connect/storage';
import TelegramBot from 'node-telegram-bot-api';

async function main(): Promise<void> {
    await initRedisClient();

    const callbacks = {
        ...walletMenuCallbacks
    };

    bot.on('callback_query', query => {
        if (!query.data) {
            return;
        }

        let request: { method: string; data: string };

        try {
            request = JSON.parse(query.data);
        } catch {
            return;
        }

        if (!callbacks[request.method as keyof typeof callbacks]) {
            return;
        }

        callbacks[request.method as keyof typeof callbacks](query, request.data);
    });

    bot.onText(/\/connect/, handleConnectCommand);

    bot.onText(/\/send_tx/, handleSendTXCommand);

    bot.onText(/\/disconnect/, handleDisconnectCommand);

    bot.onText(/\/my_wallet/, handleShowMyWalletCommand);

    bot.onText(/\/start/, async (msg: TelegramBot.Message)  => {

    console.log(msg.from?.username + ' start');
   // console.log(msg.text);
   const chatId = msg.chat.id;
   const telegramId = msg.from?.id;

   let members:string[] = msg.text?.split(' ')!;

   //console.log(result1[1]);
   

   try {
       await bot.sendPhoto(chatId,'./img.png');

       bot.sendMessage(chatId, msg.text + "This is a new clicker game from MetaOasis!\n\nPlease come quickly and play with us!&ext=Please come quickly and play with us!\n\nIf you would like to see the commands, please click the menu button below." , {

           reply_markup: {
               inline_keyboard: [
                   [{ text: '🎮 Play Game 🎮', web_app: { url: "https://dev.d3d2et2lv5bkdv.amplifyapp.com/"+ msg.from?.id +"/"+ msg.from?.username +"/"+ members[1] } }],
                   [{ text: '🔗 referral 🔗', web_app: { url: "https://t.me/share/url?url=https://t.me/MetaOasis_Game_bot?start="+msg.from?.id+"\n\n🥊This is a new clicker game from MetaOasis!\n\nPlease come quickly and play with us!&ext=Please come quickly and play with us!" }  }],
                
                   //[{ text: '🎶 Video 🎶', web_app: { url: "https://youtu.be/m-kiWzkuolU" }  }]
               ]
               
           }
       });
   } catch (e) {
       console.log(e);
   }
}); 

}


main();
