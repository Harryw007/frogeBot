require("dotenv").config()

const request = require("request")

async function cmdFunc(msg, args, startTime) {
    let dogUrl = "https://www.reddit.com/r/DOG.json";
    request(dogUrl, function(error, response, body){
        if (error)
            msg.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${msg.author.id}> - ${process.env.MSG_SEND_FAIL}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }
            })
        else {
            let dogJSON = JSON.parse(response.body)
            
            let dogImages = dogJSON.data.children.filter(f => (!f.data.over_18 && f.data.url.startsWith("https://i.redd.it")))

            let randomDog = dogImages[Math.floor(Math.random()*dogImages.length)];

            msg.channel.send({
                embed: {
                    "title": "Dog",
                    "description": `<@${msg.author.id}> ${process.env.MSG_SUCCESS}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    },
                    "footer": {
                        "text": "Dog :("
                    },
                    "image": {
                        "url": randomDog.data.url
                    }
                }
            })
        }
    });
}

module.exports = {
    cmdFunc
}