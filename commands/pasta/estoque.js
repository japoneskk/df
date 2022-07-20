const {
    // eslint-disable-next-line no-unused-vars
    Message, MessageEmbed, MessageActionRow, MessageSelectMenu, ButtonInteraction,
    MessageButton, Modal, TextInputComponent, TextChannel
} = require('discord.js');
const { Produto, ProdutoEstoque, MsgProduto } = require('../../models/vendas');

/**
* @param { Message } message
* @param { string[] } args
*/
const run = async (client, message) => {

    if (!message.member.permissions.has('ADMINISTRATOR')) return message.channel.send(`${message.member}, você não tem permissão de usar esse comando`);

    /** @type {{ _id: Number, nome: String, server_id: String, valor: Number, quantidade: Number }[]} */
    const itens = await Produto.find({ server_id: message.guildId });
    let itemAtual = itens.find(Boolean); // So pra pegar a tipagem

    if (itens.length < 1) return message.channel.send('Sem itens cadastrados para adicionar, use `cadastrarproduto`');

    const rowMenu = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('edicao_produtos_menu')
                .setPlaceholder('Selecione algum item para editar')
                .addOptions(
                    itens.map(item => (
                        {
                            label: `${item.nome} (R$ ${item.valor})`,
                            value: `${item._id}`
                        }
                    ))
                ),
        );

    const botaoAdd = new MessageButton()
        .setLabel('Adicionar')
        .setCustomId('btn_add')
        .setStyle('SUCCESS');
    
    const botaoDel = new MessageButton()
        .setLabel('Apagar')
        .setCustomId('btn_del')
        .setStyle('DANGER');

    const rowBotoes = new MessageActionRow()
        .addComponents(
            botaoAdd,
            // botaoDel
        );

    const embedBase = new MessageEmbed()
        .setTitle('Edição de produtos')
        .setDescription(
            'Atual produto: `Nenhum`\n'+
            'Valor: `---`\n'+
            'Quantidade em estoque: `--`'
        );

    const msgMenu = await message.channel.send({
        embeds: [ embedBase ],
        components: [ rowMenu, rowBotoes ]
    });

    const coletor = message.channel.createMessageComponentCollector({
        filter: i => [ 'edicao_produtos_menu', 'btn_add', 'btn_del' ].includes(i.customId),
        idle: 5 * 60 * 1_000
    });


    coletor.on('collect', async interaction => {

        if (interaction.isSelectMenu()) {

            const [ itemId ] = interaction.values;
            const itemEscolhido = itens.find(i => `${i._id}` === itemId);

            itemAtual = itemEscolhido;

            const embed = new MessageEmbed()
                .setDescription(
                    embedBase.description
                        .replace('Nenhum', itemEscolhido.nome)
                        .replace('---', `R$ ${itemEscolhido.valor.toFixed(2).replace('.', ',')}`)
                        .replace('--', itemEscolhido.quantidade)
                );

            interaction.update({ embeds: [ embed ] });
            return;
        }

        ////////////////////////////////////////////
        if (interaction.customId === 'btn_add') {

            try {

                const modalInteraction = await criarModal(interaction, message);
                
                const conteudo = modalInteraction.fields.getTextInputValue('conteudo');
                
                await modalInteraction.reply({ content: 'Processando...', ephemeral: true });
                
                itemAtual.quantidade++;
                await ProdutoEstoque.create({
                    produtoId: itemAtual._id,
                    server_id: message.guildId,
                    conteudo
                });
                await Produto.updateOne({ _id: itemAtual._id }, { quantidade: itemAtual.quantidade });
                
                await modalInteraction.editReply({ content: 'Salvo com sucesso ✅', ephemeral: true });

                const embed = new MessageEmbed()
                    .setColor('#282C34')
                    .setTitle(`${client.user.username} | Produto`)
                    .setDescription(
                        `\`\`\`${itemAtual.nome}\`\`\`\n`+
                        `💎 - **Nome:** **__${itemAtual.nome}__**\n💵 - **Preço:** **__R$${itemAtual.valor.toFixed(2).replace('.', ',')}__**\n🗃️ - **Estoque:** **__${itemAtual.quantidade}__**`
                    )
                    .setFooter(`Para comprar clique no botão abaixo.`)

                /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                const msgProduto = await MsgProduto.findOne({ server_id: message.guildId, produtoId: itemAtual._id });

                if (!msgProduto) return;

                /** @type {TextChannel} */
                const canal = message.guild.channels.cache.get(msgProduto.canal_id);
                if (!canal) return interaction.followUp({ content: `Canal de atualizar estoque de ${itemAtual.nome} não encontrado`, ephemeral: true });

                canal.messages.fetch(msgProduto.msg_id)
                    .then(async m => {
                        await m.edit({ embeds: [embed] });
                        interaction.followUp({ content: 'Mensagem de estoque de produto atualizada com sucesso', ephemeral: true });
                    })
                    .catch(() => interaction.followUp(
                        {
                            content: 'Erro ao atualizar mensagem de estoque de produto',
                            ephemeral: true
                        }
                    ));

            }
            catch(err) {
                console.log(err);
            }
        }
        ////////////////////////////////////////////
        else if (interaction.customId === 'btn_del') {


            itemAtual;
        }
        ////////////////////////////////////////////

    });

    coletor.on('end', () => {

        msgMenu.delete();
    });
};

/** @param { ButtonInteraction } interaction */
const criarModal = async (interaction, message) => {

    const modal = new Modal()
        .setCustomId('novo_item')
        .setTitle('Adicionando estoque');

    const conteudoInput = new TextInputComponent()
        .setCustomId('conteudo')
        .setLabel('O que será entregue à quem comprar?')
        .setRequired(true)
        .setMaxLength(700)
        .setStyle('PARAGRAPH');

    modal.addComponents(
        new MessageActionRow().addComponents(conteudoInput),
    );
    
    await interaction.showModal(modal);

    return await interaction.awaitModalSubmit({ filter: interaction => interaction.user.id === message.author.id, time: 120_000 });
};


module.exports = {	
    run,
    name: 'estoque',
};