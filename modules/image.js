var Jimp = require('jimp');
var gm = require('gm');
if(process.env.USE_IMAGEMAGICK == "true") {
    gm = gm.subClass({ imageMagick: true });
}
const request = require('request')

function gmToBuffer(gm, useWebp = true) {
    return new Promise(async (resolve, reject) => {
        gm.format({bufferStream: true}, function (err, format) {
            if(format == "WEBP" && !useWebp) format = "PNG"
            this.toBuffer(format, function (err, buffer) {
                if (!err) {
                    resolve(buffer);
                } else reject(err)
            });
        })
    });
}

function getFormat(imgUrl) {
    return new Promise(async (resolve, reject) => {
        gm(request(imgUrl)).format({bufferStream: true}, function (err, format) {
            resolve(format);
        });
    });
}

function readURL(imgUrl, useWebp = true) {
    return new Promise(async (resolve, reject) => {
        let maxSize = Number(process.env.MAX_IMG_SIZE)
        gm(request(imgUrl)).size({bufferStream: true}, async function (err, size) {
            this.resize(maxSize > size.width ? size.width : maxSize, maxSize > size.height ? size.height : maxSize)
            resolve(await gmToBuffer(this, useWebp))
        })
    });
}
function jimpReadURL(imgUrl) {
    return new Promise(async (resolve, reject) => {
        Jimp.read(await readURL(imgUrl, false)).then(async img => {
            resolve(img)
        }).catch(reject)
    });
}
function readBuffer(buffer) {
    return new Promise(async (resolve, reject) => {
        // Read image type supported by jimp (from buffer)
        Jimp.read(buffer).then(async img => {
            resolve(img) // Resolve image
        }).catch(reject)
    });
}

function createNewImage(w, h, bg) {
    return new Promise(async (resolve, reject) => {
        setImmediate(async () => {
            // Create image from specified parameters
            new Jimp(w, h, bg, async (err, img) => {
                if(err) {
                    reject()
                } else {
                    resolve(img) // Resolve image
                }
            })
        });
    })
}

const { Worker } = require('worker_threads');

function exec(imgUrl, list) {
    return new Promise(async (resolve, reject) => {
        if(await getFormat(imgUrl) == "GIF") {
            try {
                let worker = new Worker(__dirname+"/gif-worker.js")
                worker.postMessage({ imgUrl, list, frameSkip: 1, speed: 1, jimp: true })
    
                worker.on('message', async (img) => {
                    if(img == null) reject()
                    resolve(Buffer.from(img))
                });
            } catch(e) {
                //console.log(e)
                reject(e)
            }
        } else {
            let worker = new Worker(__dirname+"/image-worker-jimp.js")
            worker.postMessage({ imgUrl, list, allowBackgrounds: true })

            worker.on('message', (img) => {
                if(img == null) reject()
                else resolve(Buffer.from(img))
            });
        }
    })
}

function execGM(imgUrl, list) {
    return new Promise(async (resolve, reject) => {
        if(await getFormat(imgUrl) == "GIF") {
            try {
                let worker = new Worker(__dirname+"/gif-worker.js")
                worker.postMessage({ imgUrl, list, frameSkip: 1, speed: 1, jimp: false })
    
                worker.on('message', async (img) => {
                    if(img == null) reject()
                    resolve(Buffer.from(img))
                });
            } catch(e) {
                console.log(e)
                reject(e)
            }
        } else {
            let worker = new Worker(__dirname+"/image-worker.js")
            worker.postMessage({ imgUrl, list, allowBackgrounds: true })

            worker.on('message', (img) => {
                if(img == null) reject()
                else resolve(Buffer.from(img))
            });
        }
    })
}

function performMethod(img, method, params, allowBackgrounds) {
    return new Promise(async (resolve, reject) => {
        try {
            if(img.bitmap) {
                for (let i = 0; i < params.length; i++) {
                    if(typeof params[i] == "object") {
                        try{ params[i] = await readBuffer(Buffer.from(params[i])); } catch(e) {}
                    }  
                }
            }
            if(img[method]) { // If native method
                img = await img[method](...params) // Run method function on image
            } else { // If custom method or undefined method
                img = await customMethod(img, method, params, allowBackgrounds) // Attempt to run method function on image
            }
            resolve(img); // Resolve image
        } catch(e) {
            console.log(e)
            reject(e)
        }
    })
}
function customMethod(img, method, params, allowBackgrounds) {
    return new Promise(async (resolve, reject) => {
        try {
            let newImg = img;
            if(method == "canvasScale") { // Crops canvas by factor of existing size
                // canvasScale params - [0: Scale factor]
                let x = Math.round((1-params[0])*img.bitmap.width/2)
                let y = Math.round((1-params[0])*img.bitmap.height/2)
                let w = Math.round(params[0]*img.bitmap.width)
                let h = Math.round(params[0]*img.bitmap.height)
                newImg = await img.crop(x, y, w, h)
                resolve(newImg); // Resolve image
            }
            if(method == "addBackground") { // Adds colour background
                let bgImg = await createNewImage(params[0], params[1], (allowBackgrounds ? params[2] : "transparent"));
                newImg = await bgImg.composite(img, params[3], params[4])
                resolve(newImg); // Resolve image
            }
        } catch(e) {
            reject(e)
        }
    })
}

function measureText(font, str) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureText(Jimp[font], str)); // Measure text using jimp text, obsolete due to canvas text rendering.
    });
}
function measureTextHeight(font, str, width) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureTextHeight(Jimp[font], str, width)); // Measure text height using jimp text, obsolete due to canvas text rendering.
    });
}
function loadFont(path) {
    return new Promise(async (resolve, reject) => {
        Jimp.loadFont(path).then(font => {
            resolve(font) // Load and resolve font using jimp text, obsolete due to canvas text rendering.
        });
    });
}

// Exports
module.exports = {
    exec,
    execGM,
    readURL,
    jimpReadURL,
    readBuffer,
    measureText,
    measureTextHeight,
    loadFont,
    performMethod,
    customMethod,
    gmToBuffer
}