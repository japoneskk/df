/* eslint-disable no-useless-escape */
// eslint-disable-next-line no-unused-vars
const { Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, TextChannel } = require('discord.js');
const { Produto, MsgProduto } = require('../../models/vendas');

/**
* @param { Message } message
* @param { string[] } args
*/
const run = async (client, message) => {
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.channel.send(`${message.member}, você não tem permissão de usar esse comando`);
    message.delete();

    /** @type {{ _id: Number, nome: String, server_id: String, valor: Number, quantidade: Number }[]} */
    const produtos = await Produto.find({ server_id: message.guildId });

    const menuRow = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('menu_produtos')
                .setPlaceholder('Selecione um item para salvar aqui')
                .addOptions(produtos
                    .map(produto => ({

                        label: produto.nome,
                        value: `${produto._id}`,
                        description: `Valor R$ ${produto.valor}`,
                    })
                    )
                )
        );

    const msgMenu = await message.channel.send({ components: [menuRow] });

    const menuCollector = message.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', idle: 120_000 });

    menuCollector.on('collect', async i => {

        const itemSelecionado = produtos.find(p => `${p._id}` === i.values[0]);

        console.log(itemSelecionado);

        const embed = new MessageEmbed()
            .setColor('#282C34')
            .setTitle(`${client.user.username} | Produto`)
            .setDescription(
                `\`\`\`${itemSelecionado.nome}\`\`\`\n`+
            `💎 - **Nome:** **__${itemSelecionado.nome}__**\n💵 - **Preço:** **__R$${itemSelecionado.valor.toFixed(2).replace('.', ',')}__**\n🗃️ - **Estoque:** **__${itemSelecionado.quantidade}__**`
            )
            .setFooter(`Para comprar clique no botão abaixo.`)

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setStyle('SUCCESS')
                    .setEmoji('🛒')
                    .setCustomId(`pix-${itemSelecionado._id}`)
                    .setLabel('Comprar')
            );

        const filtroBusca = { produtoId: itemSelecionado._id, server_id: message.guildId };

        /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
        const msgProduto = await MsgProduto.findOne(filtroBusca);

        if (msgProduto) {

            try {
                /** @type {TextChannel} */
                const canal = message.guild.channels.cache.get(msgProduto.canal_id);
                const msgRegistrada = await canal?.messages.fetch(msgProduto.msg_id);

                

                await msgMenu.delete();
            }
            catch (error) {

                await i.channel.send({ content: '.', ephemeral: true });
                msgMenu.delete().catch(() => {});
                return;
            }

        }

        await i.deferUpdate();
        const msgProdutoFinal = await message.channel.send({ components: [row], embeds: [embed] });

        await MsgProduto.create({
            canal_id: message.channelId,
            msg_id: msgProdutoFinal.id,
            server_id: message.guildId,
            produtoId: itemSelecionado._id,
        });

        await i.followUp({ content: 'Salvo com sucesso', ephemeral: true });
        msgMenu.delete();


    });

};


module.exports = {    
    run,
    name: 'criar',
};