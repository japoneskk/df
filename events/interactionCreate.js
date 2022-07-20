/* eslint-disable no-useless-escape */
// eslint-disable-next-line no-unused-vars
const { Interaction, MessageAttachment, MessageActionRow, MessageEmbed, MessageButton } = require('discord.js');
const { Buffer } = require('buffer');
const { Pagamento, Produto, ProdutoEstoque, MsgProduto } = require('../models/vendas');
const mercadopago = require('mercadopago');
const { accessToken } = require('../../config.json');
const { channel } = require('diagnostics_channel');

mercadopago.configure({
    access_token: accessToken
});

module.exports = {
    name: 'interactionCreate',
    /** @param {Interaction} interaction */
    async run(interaction, client) {

        /** @typedef {Object} Produto
         * @property {Number} _id
         * @property {String} nome
         * @property {String} server_id
         * @property {Number} valor
         * @property {Number} quantidade
         */

        /** @typedef {Object} MsgProduto
         * @property {String} canal_id
         * @property {String} msg_id
         * @property {String} server_id
         * @property {Number} produtoId
         */

        if (interaction.isButton()) {

            const button = interaction.customId;

            ///////////////////////////////////////
            const atualizarMgProduto = async (itemAtual) => {
                const embed = new MessageEmbed()
                    .setColor('#282C34')
                    .setTitle(`${client.user.username} | Produto`)
                    .setDescription(
                        `\`\`\`${itemAtual.nome}\`\`\`\n`+
                    `💎 - **Nome:** **__${itemAtual.nome}__**\n💵 - **Preço:** **__R$${itemAtual.valor.toFixed(2).replace('.', ',')}__**\n🗃️  - **Estoque:** **__${itemAtual.quantidade}__**`
                    )
                    .setFooter(`Para comprar clique no botão abaixo.`)

                /** @type {MsgProduto}*/
                const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                if (!msgProduto) return;

                /** @type {TextChannel} */
                const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                if (!canal) return interaction.followUp({ content: `Canal de atualizar estoque de ${itemAtual.nome} não encontrado`, ephemeral: true });

                canal.messages.fetch(msgProduto.msg_id)
                    .then(async m => {
                        await m.edit({ embeds: [embed] });
                        interaction.followUp({ content: 'Estoque atualizado com sucesso!', ephemeral: true });
                    })
                    .catch(() => interaction.followUp(
                        {
                            content: 'Erro ao atualizar mensagem de estoque de produto',
                            ephemeral: true
                        }
                    ));
            };
            ///////////////////////////////////////

            if (button.startsWith('verificar-')) {

                const [, pagamentoId ] = button.split('-');
                interaction.reply({ content: `${interaction.user} estou verificando meus arquivos, aguarde, essa verificação dura no maximo 1 minuto, caso não tenha recebido seu produto chame um de nossos moderadores no privado`, ephemeral: true });
                const res = await mercadopago.payment.get(Number(pagamentoId));
                const pagamentoStatus = res.body.status;
                const nome = res.body.description;

                if (pagamentoStatus === 'approved') {

                    /** @type {Produto} */
                    const produto = await Produto.findOne({ server_id: interaction.guildId, _id: Number(pagamentoId) });
                    await Pagamento.updateOne({ _id: Number(pagamentoId) }, {
                        pagamento_confirmado: true,
                        data: res.body.date_approved
                    });

                    const produtoComprado = await ProdutoEstoque.findOne({ server_id: interaction.guildId, produtoId: produto._id });

                    interaction.user.send({ content: `Aqui está sua compra, obrigado por comprar em nossa loja!\n${produtoComprado.conteudo}` })
                        .then(async () => {

                            await interaction.followUp({ content: `${interaction.user} verifique sua DM`, ephemeral: true });
                            await ProdutoEstoque.deleteOne({
                                produtoId: produto._id,
                                server_id: interaction.guildId,
                                conteudo: produtoComprado.conteudo
                            });

                            produto.quantidade--;
                            await Produto.updateOne(
                                {
                                    _id: produto._id,
                                    server_id: interaction.guildId
                                },
                                {
                                    quantidade: produto.quantidade
                                }
                            );

                            MgPatualizarroduto(produto);
                            
                        }
                        )
                        .catch(() => interaction.followUp({ content: `${interaction.user}, sua DM parece fechada`, ephemeral: true }));
                }
            }

            if (button.startsWith('pix')) {

                const findCarrinho = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
                if (findCarrinho) return interaction.reply({ content: `Você Já Tem Um Carrinho Aberto No Canal: ${findCarrinho}`, ephemeral: true });

                /** @type {Produto} */
                const itens = await Produto.find({ server_id: interaction.guildId });

                if (itens.length < 1) return interaction.editReply({ content: 'Nenhum produto cadastrado', ephemeral: true });

                const produtoId = Number(button.split('-')[1]);

                const { nome, _id } = itens.find(obj => obj._id === produtoId);

                const produtoComprado = await ProdutoEstoque.findOne({ produtoId: _id, server_id: interaction.guildId });

                if (!produtoComprado) return interaction.reply({ content: `${interaction.user} não há produtos \`${nome}\` no estoque`, ephemeral: true });


                interaction.guild.channels.create(`carrinho-${interaction.user.username}`, {
                    type: "GUILD_TEXT",
                parent: 'AQUI', //ID DA CATEGORIA
                topic: interaction.user.id,
                permissionOverwrites: [
                  {
                    id: interaction.user.id,
                    allow: ["VIEW_CHANNEL"],
                    deny: ["SEND_MESSAGES"],
                  },
                  {
                    id: interaction.guild.id,
                    deny: ["VIEW_CHANNEL"],
                  },
                ],
                }).then(async (channel) => {
                    interaction.reply({ content: `Seu Carrinho Foi Gerado No Canal: ${channel}`, ephemeral: true });
                    channel.send({
                        content: `${interaction.user}`,
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`${client.user.username} | CARRINHO `)
                                .setDescription(`Após continuar sua compra, deixa seu privado aberto!`)
                                .setTimestamp()
                                .setFooter({ text: `${interaction.guild.name} | CARRINHO`, iconURL: interaction.guild.iconURL({ dynamic: true, format: 'gif' }) })
                        ],
                        components: [
                            new MessageActionRow()
                                .addComponents(
                                    new MessageButton().setCustomId('finalizar-'+ _id).setLabel('✔ Continuar compra').setStyle('SUCCESS'),
                                    new MessageButton().setCustomId('cancelar').setLabel('✖️ Fechar Carrinho').setStyle('DANGER')
                                )
                        ]
                    });
                });
            }

            

            if (button === 'cancelar') {

            interaction.channel.delete();

            }

            if (button.startsWith('finalizar-')) {

                /** @type {Produto} */
                const itens = await Produto.find({ server_id: interaction.guildId });

                if (itens.length < 1) return interaction.reply({ content: 'Nenhum produto cadastrado', ephemeral: true });

                const produtoId = Number(button.split('-')[1]);


                const { nome, valor, _id } = itens.find(obj => obj._id === produtoId);

                const produtoComprado = await ProdutoEstoque.findOne({ produtoId: _id, server_id: interaction.guildId });

                try {

                    const email = 'emaildesconhecido@gmail.com'; // Email qualquer aqui

                    const payment_data = {
                        transaction_amount: valor,
                        description: nome,
                        payment_method_id: 'pix',
                        payer: {
                            email,
                            first_name: `${interaction.user.tag} (${interaction.user.id})`,
                        }
                    };


                    const data = await mercadopago.payment.create(payment_data);                    
                    const base64_img = `data:image/png;base64,${data.body.point_of_interaction.transaction_data.qr_code_base64}`;

                    const buf = new Buffer.from(base64_img.split(',')[1], 'base64');
                    const attachment = new MessageAttachment(buf, 'qrcode.png');

                    await Pagamento.create({
                        _id: parseInt(data.body.id),
                        user_id: interaction.user.id,
                        pagamento_confirmado: false,
                    });

                    await interaction.reply({
                        content: `**✅ Pagamento PIX gerado com o valor de R$ ${payment_data.transaction_amount.toFixed(2).replace('.', ',')}\n`+
                            'Você pode pagar pelo QrCode ou PIX Copia e cola\nQR Code:**\n'+
                            `PIX Copia e cola abaixo (Deixe sua DM aberta ${interaction.user} )`,
                        files: [attachment],
                        ephemeral: true
                    });

                    interaction.followUp({
                        content: `${data.body.point_of_interaction.transaction_data.qr_code}`,
                        ephemeral: true
                    });

                    let tentativas = 0;
                    const interval = setInterval(async () => {
                    // Verificando se foi pago automaticamente
                    // console.log('tentativa: ', tentativas+1);
                        tentativas++;

                        const res = await mercadopago.payment.get(data.body.id);
                        const pagamentoStatus = res.body.status;

                        if (tentativas >= 3 || pagamentoStatus === 'approved') {

                            clearTimeout(interval);

                            if (pagamentoStatus === 'approved') {

                                await Pagamento.updateOne({ _id: Number(data.body.id) }, {
                                    pagamento_confirmado: true,
                                    data: res.body.date_approved
                                });
                                const categoriaProduto = itens.find(i => i._id === _id);

                                interaction.user.send(`Aqui está sua compra, obrigado por comprar em nossa loja!\n\`${produtoComprado.conteudo}\``)

                                interaction.guild.channels.cache.get("chat de logs das vendas").send({
                                    content: `${interaction.user}`,
                                    embeds: [
                                        new MessageEmbed()
                                            .setTitle(`${client.user.username} | Venda`)
                                            .setDescription(`Comprador: ${interaction.user}\nID da compra: ${data.body.id}\nProduto: ${nome}\nPreço: R$${payment_data.transaction_amount.toFixed(2).replace('.', ',')}`)
                                            .setTimestamp()
                                    ]})
                                    .then(async () => {
                                        await interaction.followUp({ content: `${interaction.user} verifique seu DM!`, ephemeral: true });
                                        await ProdutoEstoque.deleteOne({
                                            produtoId: _id,
                                            server_id: interaction.guildId,
                                            conteudo: produtoComprado.conteudo
                                        });

                                        categoriaProduto.quantidade--;
                                        await Produto.updateOne(
                                            {
                                                _id,
                                                server_id: interaction.guildId
                                            },
                                            {
                                                quantidade: categoriaProduto.quantidade
                                            }
                                        );
                                        
                                        atualizarMgProduto(categoriaProduto);
                                    }
                                    )
                                    .catch(() => interaction.followUp({ content: 'Erro ao enviar produto no DM', ephemeral: true }));
                            }
                            else if (pagamentoStatus !== 'approved') {
                                interaction.channel.send({
                                    content: `${interaction.user}, caso seu produto não foi entregue automaticamente, clique no botao abaixo para verificar o pagamento`,
                                    ephemeral: true,
                                    components: [
                                        new MessageActionRow()
                                            .addComponents(
                                                new MessageButton()
                                                    .setCustomId(`verificar-${data.body.id}`)
                                                    .setStyle('PRIMARY')
                                                    .setLabel('Verificar')
                                            )
                                    ]
                                });
                            }
                        }
                    }, 30_000);

                }
                catch (error) {
                        
                    const msgErro = { content: 'Erro ao processar os dados', ephemeral: true };
                    interaction.reply(msgErro)
                        .catch(() => interaction.followUp(msgErro));
                    console.log(error);
                }
            }
        }
    }
};