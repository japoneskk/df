const fs = require("fs");
const { Collection } = require('discord.js');
const config = require('../config.json')

module.exports = {

    run: async (client) => {

        //===============> Commnad Handler <===============//

        client.commands = new Collection();
        client.aliases = new Collection();
        client.categories = fs.readdirSync(`./src/commands/`);

        fs.readdirSync('./src/commands/').forEach(local => {
            const comandos = fs.readdirSync(`./src/commands/${local}`).filter(arquivo => arquivo.endsWith('.js'))

            for(let file of comandos) {
                let puxar = require(`../src/commands/${local}/${file}`)

                if(puxar.name) {
                    client.commands.set(puxar.name, puxar)
                } 
                if(puxar.aliases && Array.isArray(puxar.aliases))
                    puxar.aliases.forEach(x => client.aliases.set(x, puxar.name))
            } 
        });


        client.on('messageCreate', async (message) => {

            let prefix = config.prefix;

            if (message.author.bot) return;
            if (message.content.indexOf(prefix) !== 0) return;
            const args = message.content.slice(prefix.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();
            const cmd = client.commands.get(command);
            if (!cmd) return;
            cmd.run(client, message, args);
        })

        //===============> Commnad Handler <===============//

        //===============> Event Handler <===============//

        const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith(".js"));
        for (const file of eventFiles) {
            const event = require(`../src/events/${file}`);

            if (event.once) {
                client.once(event.name, (...args) => event.run(...args, client));
            } else {
                client.on(event.name, (...args) => event.run(...args, client));
            }
        }

        //===============> Event Handler <===============//



        //===============> Anti Crash <===============//

        process.on('multipleResolves', (type, reason, promise) => {
            console.log(`❌ | Erro detectado\n\n` + type, promise, reason)

        })
        
        process.on('unhandRejection', (reason, promise) => {
            console.log(`❌ | Erro detectado\n\n` + promise, reason)

        })
        process.on('uncaughtException', (error, origin) => {
            console.log(`❌ | Erro detectado\n\n` + error, origin)

        })
        
        process.on('uncaughtExceptionMonitor', (error, origin) => {
            console.log(`❌ | Erro detectado\n\n` + error, origin)

        })

        //===============> Anti Crash <===============//
        
    }
}