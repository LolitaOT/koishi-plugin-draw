import { Context,Logger, segment  } from 'koishi'
import glob from 'glob'
import fs from 'fs/promises'
import path from 'path'
import _ from 'lodash'

export const logger = new Logger('draw')

interface Config {
  filePath: string
}

interface DescFile {
  name?: string, 
  template: string,
  itemTemplate: string,
  defaultCount?: number,
  resources: [
    {
      type: string, 
      datas: [string | string[]],
      weight?: number[]
    }
  ],
  guaranteed?: [number,number,number]
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
  ctx.command('draw <pool> <count>', { hidden: true })
  .option('list', '-l 输出已有列表')
  .option('update', '-u 更新缓存', { hidden: true, authority: 2 })
  .action( async ( { session, options }, pool, count ) => {
    if(options?.list) {
      return '已存在的卡池有：\n' + Object.keys(poolCache).join('、')
    }
    if(options?.update) {
      await initPoolCache()
      return '缓存已更新'
    }
    if(!pool) {
      return '请输入卡池名称，使用示例：draw 卡池名称 抽取次数 。抽取次数选填'
    }
    const descpath = poolCache[pool]
    if(!descpath) {
      return '未找到卡池：' + pool
    }
    return await gocha(descpath, count)
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
}


async function gocha(descPath: string, c: string | undefined): Promise<string> {
  const desc: DescFile = JSON.parse((await fs.readFile(descPath)).toString())
  const count = c ? Number(c) : desc.defaultCount || 1

  let items = ''
  const resources = desc.resources

  // 循环遍历抽几次
  for (let index = 0; index < count; index++) {
    // 每个抽取事件都要进行一次
    let itemTemplate = desc.itemTemplate.toString()
    // console.log(typeof itemTemplate)
    for (let resourcesIndex = 0; resourcesIndex < resources.length; resourcesIndex++) {
      const resource = resources[resourcesIndex];
      let datas: Array<string|string[]> = [] // 都有哪些卡池
      // 如果设置了权重，就要确认要抽取的卡池
      if(resource.weight && resource.weight.length > 0 ) {
        // _.shuffle()
        const weight_bk = _.cloneDeep(resource.weight)
        const weight_sort = resource.weight.sort((a,b) => b - a)
        const total = weight_sort.reduce((pre,cur) => pre += cur)
        const v = Math.random() * total // 本次概率
        let i = 0
        while(v > weight_sort[i]) {
          i ++
        }
        // const targetPool = 
        // continue
      } else {
        datas = resource.datas
      }
      let pool: string[] = [] // 卡池中的卡
      // 将池子中所有的数据展平，路径转为具体数据
      // 但是目前只有图片会有这种需求
      for (let dataIndex = 0; dataIndex < datas.length; dataIndex++) {
        const data = datas[dataIndex];
        if(Array.isArray(data)) {
          pool = [...pool, ...data.map(v => resource.type === 'image' ? path.resolve(filePath, v) : v)]
        } else if (resource.type === 'image'){
          const files = glob.sync(path.resolve(filePath, data, '*.{png,jp{,e}g,gif}'))
          pool = [...pool, ...files]
        }
      }
      let val = draw(pool)
      if(resource.type === 'image') {
        val = segment('image', { url: 'base64://' + await fs.readFile(val, 'base64') }) 
      }
      const reg = new RegExp(`\\{${resourcesIndex}\\}`, 'g')
      itemTemplate = itemTemplate.replace(reg, val) 
    }
    items += itemTemplate
  }
  const result = desc.template.replace(/\{0\}/g, items)
  return result
}

// 通过 洗牌算法 保证每个元素出现在各个位置的概率是一致的，所以只用返回第一个元素就完成了一次抽卡
function draw<T>(arr:T[]): T {
  const t = _.shuffle(arr)
  return t[0]
}
