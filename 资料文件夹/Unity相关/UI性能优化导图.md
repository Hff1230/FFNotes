- 整理切图与图集

- 是否规范清晰，移除老旧废弃的切图
- 该建图集的目录是否漏建图集
- 图集页数，≥2张就要注意；图集里是否有特别大的图，大的背景图要挪到PageBackground里，其余大图具体分析
- 这几条在开发的时候就应该注意

- 有瞬时掉帧？（打开界面或进行某些操作）

- 资源加载

- 同步改异步

- 实例化

- 优化、简化prefab及其挂载着的component
- ScrollView类型的列表，勾上分帧实例化item的选项

- 其他GC（C#、Lua的界面逻辑代码中）

- string拼接
- Boxing (C#与Lua传递未优化的struct)
- lambda, closure
- SetActive, GetComponent
- 打log

- 平均帧率低？

- 留意Update中是否存在高消耗的逻辑
- 如果有LCaptureContainer

- LCaptureContainer和RenderTexture的参数是否可优化

- Batches（或FrameDebugger里看UI相机的DrawCall）过高

- 漏设置图集
- 图层之间（特别是列表Item之间）有重叠，打断了合批
- 全屏界面但主相机还在渲染？

- 调整ui-config的fullscreen参数

- Overdraw过高

- 隐藏不可见的大图层
- 利用LImage的CullNoneSprite

- 内存占用高？

- 图集整理优化
- 调整图片压缩格式与参数
- LCaptureContainer里含有小3D场景的话另行分析