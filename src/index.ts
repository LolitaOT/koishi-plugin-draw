import { Context,Logger } from 'koishi'
import glob from 'glob'
import fs from 'fs/promises'
import path from 'path'

export const logger = new Logger('draw')

interface Config {
  filePath: string
}

interface DescFile {
  name?: string
}

let poolCache: { [index: string]: string} = {}
let filePath = ''
export const name = 'draw'
export const apply = async (ctx: Context, config: Config) => {
  // console.log(config.filePath)
  if(!config.filePath) {
    return logger.error('请在配置项中传入filePath选项')
  }
  filePath = config.filePath
  await initPoolCache()
  console.log(poolCache)
  ctx.command('draw').option('list', '-l 输出已有列表').action( async ( { session, options } ) => {
    if(options?.list) {
      return '已存在的卡池有：\n' + Object.keys(poolCache).join('、')
    }
    return 'ok'
  })
}


async function initPoolCache() { 
  poolCache = {}
  const filenames = glob.sync(path.resolve(filePath, '**.json'))
  for (let index = 0; index < filenames.length; index++) {
    const file = filenames[index];
    const json:DescFile = JSON.parse((await fs.readFile(file)).toString())
    if(!json.name) {
      logger.error(`%s 文件中下不存在 name 属性`, file)
      continue
    } else {
      poolCache[json.name] = file
    }
  }
  // console.log(poolCache)
}
