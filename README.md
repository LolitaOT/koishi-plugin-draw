# koishi-plugin-draw
抽卡模拟器

### 思路

- config 中设置系统存储文件的位置
- 启动时扫描文件夹下所有描述并缓存
  - 文件夹中应有index.js文件
  - 文件需要导出name与renderValue方法
- 暂时这样实现 
