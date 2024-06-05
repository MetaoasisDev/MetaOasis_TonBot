import { CHAIN, isTelegramUrl, toUserFriendlyAddress, UserRejectsError } from '@tonconnect/sdk';
import { bot } from './bot';
import { getWallets, getWalletInfo } from './ton-connect/wallets';
import QRCode from 'qrcode';
import TelegramBot from 'node-telegram-bot-api';
import { getConnector } from './ton-connect/connector';
import { addTGReturnStrategy, buildUniversalKeyboard, pTimeout, pTimeoutException } from './utils';

let newConnectRequestListenersMap = new Map<number, () => void>();

export async function handleConnectCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    let messageWasDeleted = false;

    newConnectRequestListenersMap.get(chatId)?.();

    const connector = getConnector(chatId, () => {
        unsubscribe();
        newConnectRequestListenersMap.delete(chatId);
        deleteMessage();
    });

    await connector.restoreConnection();
    
    if (connector.connected) {
        const connectedName =
            (await getWalletInfo(connector.wallet!.device.appName))?.name ||
            connector.wallet!.device.appName;

            let members:string[] = msg.text?.split(' ')!;

            await bot.sendPhoto(chatId,'./img.png');

            await bot.sendMessage(chatId, "🎉🎉Congratulations🎉🎉\nYou have successfully added your wallet!\n" + "👛👛Connect wallet address👛👛\n" + `${toUserFriendlyAddress(
                connector.wallet!.account.address,
                connector.wallet!.account.chain === CHAIN.TESTNET
            )}` , {

                 reply_markup: {
                    inline_keyboard: [
                      [{ text: '🎮 Play Game 🎮', web_app: { url: "https://dev.d3d2et2lv5bkdv.amplifyapp.com/"+ msg.from?.id +"/"+ msg.from?.username +"/"+ members[1] + "/" + `${toUserFriendlyAddress(
                        connector.wallet!.account.address,
                        connector.wallet!.account.chain === CHAIN.TESTNET
                    )}` }}],

                       [{ text: '🔗 referral 🔗', web_app: { url: "https://t.me/share/url?url=https://t.me/MetaOasis_Game_bot?start="+msg.from?.id+"\n\n🥊This is a new clicker game from MetaOasis!\n\nPlease come quickly and play with us!&ext=Please come quickly and play with us!" }  }],
                    
                     //[{ text: '🎶 Video 🎶', web_app: { url: "https://youtu.be/m-kiWzkuolU" }  }]
                   ]
                 }
            });

        return;
    }

    const unsubscribe = connector.onStatusChange(async wallet => {
        if (wallet) {
            await deleteMessage();

            const walletName =
                (await getWalletInfo(wallet.device.appName))?.name || wallet.device.appName;

            // await bot.sendMessage(chatId, `${toUserFriendlyAddress(
            //     connector.wallet!.account.address,
            //     connector.wallet!.account.chain === CHAIN.TESTNET
            // )}  wallet connected successfully`);

            let members:string[] = msg.text?.split(' ')!;

            await bot.sendPhoto(chatId,'./img.png');

            await bot.sendMessage(chatId,"🎉🎉Congratulations🎉🎉\nYou have successfully added your wallet!\n" + "👛👛Connect wallet address👛👛\n"  + `${toUserFriendlyAddress(
                connector.wallet!.account.address,
                connector.wallet!.account.chain === CHAIN.TESTNET
            )}` , {

                 reply_markup: {
                    inline_keyboard: [
                      [{ text: '🎮 Play Game 🎮', web_app: { url: "https://dev.d3d2et2lv5bkdv.amplifyapp.com/"+ msg.from?.id +"/"+ msg.from?.username +"/"+ members[1] + "/" + `${toUserFriendlyAddress(
                        connector.wallet!.account.address,
                        connector.wallet!.account.chain === CHAIN.TESTNET
                    )}` }}],

                    [{ text: '🔗 referral 🔗', web_app: { url: "https://t.me/share/url?url=https://t.me/MetaOasis_Game_bot?start="+msg.from?.id+"\n\n🥊This is a new clicker game from MetaOasis!\n\nPlease come quickly and play with us!&ext=Please come quickly and play with us!" }  }],
                    
                     //[{ text: '🎶 Video 🎶', web_app: { url: "https://youtu.be/m-kiWzkuolU" }  }]
                   ]
                 }
            });

            unsubscribe();

            newConnectRequestListenersMap.delete(chatId);
        }
    });

    const wallets = await getWallets();

    const link = connector.connect(wallets);
    const image ="./img.png";

    const keyboard = await buildUniversalKeyboard(link, wallets);

    const botMessage = await bot.sendPhoto(chatId, image, {
        reply_markup: {
            inline_keyboard: [keyboard]
        }
    });

    const deleteMessage = async (): Promise<void> => {
        if (!messageWasDeleted) {
            messageWasDeleted = true;
            await bot.deleteMessage(chatId, botMessage.message_id);
        }
    };

    newConnectRequestListenersMap.set(chatId, async () => {
        unsubscribe();

        await deleteMessage();

        newConnectRequestListenersMap.delete(chatId);
    });
}

export async function handleSendTXCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await bot.sendMessage(chatId, 'Connect wallet to send transaction');
        return;
    }

    pTimeout(
        connector.sendTransaction({
            validUntil: Math.round(
                (Date.now() + Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)) / 1000
            ),
            messages: [
                {
                    amount: '1000000',
                    address: '0:0000000000000000000000000000000000000000000000000000000000000000'
                }
            ]
        }),
        Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)
    )
        .then(() => {
            bot.sendMessage(chatId, `Transaction sent successfully`);
        })
        .catch(e => {
            if (e === pTimeoutException) {
                bot.sendMessage(chatId, `Transaction was not confirmed`);
                return;
            }

            if (e instanceof UserRejectsError) {
                bot.sendMessage(chatId, `You rejected the transaction`);
                return;
            }

            bot.sendMessage(chatId, `Unknown error happened`);
        })
        .finally(() => connector.pauseConnection());

    let deeplink = '';
    const walletInfo = await getWalletInfo(connector.wallet!.device.appName);
    if (walletInfo) {
        deeplink = walletInfo.universalLink;
    }

    if (isTelegramUrl(deeplink)) {
        const url = new URL(deeplink);
        url.searchParams.append('startattach', 'tonconnect');
        deeplink = addTGReturnStrategy(url.toString(), process.env.TELEGRAM_BOT_LINK!);
    }

    await bot.sendMessage(
        chatId,
        `Open ${walletInfo?.name || connector.wallet!.device.appName} and confirm transaction`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `Open ${walletInfo?.name || connector.wallet!.device.appName}`,
                            url: deeplink
                        }
                    ]
                ]
            }
        }
    );
}

export async function handleDisconnectCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await bot.sendMessage(chatId, "You didn't connect a wallet");
        return;
    }

    await connector.disconnect();

    await bot.sendMessage(chatId, 'Wallet has been disconnected');
}

export async function handleShowMyWalletCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await bot.sendMessage(chatId, "You didn't connect a wallet");
        return;
    }

    const walletName =
        (await getWalletInfo(connector.wallet!.device.appName))?.name ||
        connector.wallet!.device.appName;

    await bot.sendMessage(
        chatId,
        `Connected wallet: ${walletName}\nYour address: ${toUserFriendlyAddress(
            connector.wallet!.account.address,
            connector.wallet!.account.chain === CHAIN.TESTNET
        )}`
    );
}
