const phin = require('phin')
const cheerio = require('cheerio');
const fs = require('fs')
const path = require('path')

const existingFile = (dirName) => fs.existsSync(path.join(__dirname, dirName))
const mkDir = (dirName) => fs.mkdirSync(path.join(__dirname, dirName))
const writeFile = (fileName, image) => fs.writeFileSync(path.join(__dirname, fileName), image)
const existingAndMkDir = (dirName) => !existingFile(dirName) && mkDir(dirName)
const existingAndWriteFile = (dirName, image) => !existingFile(dirName) && writeFile(dirName, image)

const parseBody = (res) => Buffer.from(res.body, 'base64')

const fetchDirName = async () => {
    const resPage = await phin(`https://digimonmeta.com/wp-content/gallery/`);
    const body = parseBody(resPage);
    const $ = cheerio.load(body);
    const table = $('table')
    const dirList = []
    table.find('tr').each((i, el) => {
        if (i < 3) {
            return
        }

        const [dir] = $(el).text().split( '/')

        if (dir) {
            dirList.push(dir.trim())
        }
    })

    return dirList
}

const fetch =  async () =>  {
    const dirList = await fetchDirName()
    existingAndMkDir('image')
    for (const dir of dirList) {
        existingAndMkDir(path.join('image', dir))
        console.log(`create dir ${dir}`)

        const resPage = await phin(`https://digimonmeta.com/wp-content/gallery/${dir}/`);
        console.log(`fetch ${dir}`)

        const body = parseBody(resPage);
        const $ = cheerio.load(body);
        const table = $('table')
        const getImageList = []
        table.find('tr').each((i, el) => {
            const [cardName] = $(el).text().split( ' ')
            const foundCard = cardName.toLowerCase().match(/(jpg)$/g);
            if (foundCard) {
                const resPic = phin(`https://digimonmeta.com/wp-content/gallery/${dir}/${cardName.trim()}`);
                getImageList.push(resPic)
            }
        })

        const imageListRes = await Promise.all(getImageList)
        console.log('waiting', dir)

        for (const img of imageListRes) {
            const image = parseBody(img)
            const fileName = img.req.path.split('/').pop()
            existingAndWriteFile(path.join('image', dir, fileName), image)
        }
        console.log('save', dir)
    }
}

fetch()
