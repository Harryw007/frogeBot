require("dotenv").config()

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, sendImage, clamp } = require("../../modules/utils.js")

let { execGM } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()
        
        imageUrl = await findImage(msg)
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1];

        let r = (args.length > 0 && Number.isInteger(Number(args.split(" ")[0]))) ? Number(args.split(" ")[0]) : 10;
        let img = await execGM(imageUrl, [ ["jpeg", [clamp(r, 0, 100)]] ]);
        
        sendImage(msg, "JPEG", startTime, img, ( extension == "gif" ? "gif" : "jpg" ), procMsg)
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${msg.author.id}> - ${ imageUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
        procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}