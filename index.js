const phin = require('phin')
const cheerio = require('cheerio');
const fs = require('fs')
const path = require('path')

const existingFile = (dirName) => fs.existsSync(path.join(__dirname, dirName))
const mkDir = (dirName) => fs.mkdirSync(path.join(__dirname, dirName))
const writeFile = (fileName, image) => fs.writeFileSync(path.join(__dirname, fileName), image)
const existingAndMkDir = (dirName) => !existingFile(dirName) && mkDir(dirName)
const existingAndWriteFile = (dirName, image) => !existingFile(dirName) && writeFile(dirName, image)

const getElement = async (url) => {
    const res = await phin(url);
    const html = parseBody(res);
    return cheerio.load(html)
}

const parseBody = (res) => Buffer.from(res.body, 'base64')

const fetchDirName = async () => {
    const $ = await getElement('https://digimonmeta.com/wp-content/gallery/')
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

        const $ = await getElement(`https://digimonmeta.com/wp-content/gallery/${dir}/`)
        const table = $('table')
        console.log(`fetch ${dir}`)
        const getImageList = []
        table.find('tr').each((i, el) => {
            const rawCardName = $(el).text().split( ' ')
            const cardName = rawCardName[0].trim()
            const foundCard = cardName.toLowerCase().match(/(jpg)$/g);

            if (foundCard && !existingFile(path.join('image', dir, cardName))) {
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
