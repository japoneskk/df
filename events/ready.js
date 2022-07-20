const cor = require('colors') // npm i colors
const { default: mongoose } = require('mongoose')
const config = require('../../config.json')
module.exports = {
    name: 'ready',

    run: async (client) => {
        const guild = client.guilds.cache.get('AQUI') //ID DO SERVIDOR
        
        console.log(cor.blue("\n» [CLIENT INFO] Estou online;"))
        console.log(cor.red(`» [CLIENT INFO] ${client.user.username} foi iniciado com sucesso em ` + (cor.white(`${client.guilds.cache.size}`) + ` servidores;`)))
        console.log(cor.green(`» [CLIENT INFO] Carregado ` + (cor.white(`${client.commands.size}`) + ` comandos;`)));
        console.log(cor.black(`» [CLIENT INFO] Conectado com ` + (cor.white(`${guild.memberCount}`) + ` membros;`)));
        console.log(cor.yellow(`» [CLIENT INFO] Gerenciando ` + (cor.white(`${client.channels.cache.filter(c => c.id !== c.guild).size}`) + ` canais;`)));
        console.log(cor.white(`» [CLIENT INFO] Gerenciando ` + (cor.white(`${guild.roles.cache.size}`) + ` cargos;\n`)));

        const mongoose = require('mongoose');
            mongoose.connect(config.mongo_key)
        .then(() => console.log(cor.rainbow('» [DATA BASE] Gerenciando Conectado com sucesso ao banco de dados')))
        .catch(err => console.log(cor.red('» [DATA BASE] Gerenciando Erro ao conectar ao banco de dados: ', err)));

    }
} 