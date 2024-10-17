Unity中一些常用的包含文件

|文 件 名|描 述|
|---|---|
|UnityCG.cginc|包含了最常使用的帮助函数、宏和结构体等|
|UnityShaderVariables.cginc|在编译Unity Shader时，会被自动包含进来。包含了许多内置的全局变量，如UNITY_MATRIX_MVP等|
|Lighting.cginc|包含了各种内置的光照模型，如果编写的是Surface Shader的话，会自动包含进来|
|HLSLSupport.cginc|在编译Unity Shader时，会被自动包含进来。声明了很多用于跨平台编译的宏和定义|
UnityCG.cginc中一些常用的结构体

|名 称|描 述|包含的变量|
|---|---|---|
|appdata_base|可用于顶点着色器的输入|顶点位置、顶点法线、第一组纹理坐标|
|appdata_tan|可用于顶点着色器的输入|顶点位置、顶点切线、顶点法线、第一组纹理坐标|
|appdata_full|可用于顶点着色器的输入|顶点位置、顶点切线、顶点法线、四组（或更多）纹理坐标|
|appdata_img|可用于顶点着色器的输入|顶点位置、第一组纹理坐标|
|v2f_img|可用于顶点着色器的输出|裁剪空间中的位置、纹理坐标|

强烈建议读者找到UnityCG.cginc文件并查看上述结构体的声明，这样的过程可以帮助我们快速理解Unity中一些内置变量的工作原理。

UnityCG.cginc中一些常用的帮助函数

|函 数 名|描 述|
|---|---|
|float3 WorldSpaceViewDir (float4 v)|输入一个模型空间中的顶点位置，返回世界空间中从该点到摄像机的观察方向|
|float3 ObjSpaceViewDir (float4 v)|输入一个模型空间中的顶点位置，返回模型空间中从该点到摄像机的观察方向|
|float3 WorldSpaceLightDir (float4 v)|**仅可用于前向渲染中** 。输入一个模型空间中的顶点位置，返回世界空间中从该点到光源的光照方向。没有被归一化|
|float3 ObjSpaceLightDir (float4 v)|**仅可用于前向渲染中** 。输入一个模型空间中的顶点位置，返回模型空间中从该点到光源的光照方向。没有被归一化|
|float3 UnityObjectToWorldNormal (float3 norm)|把法线方向从模型空间转换到世界空间中|
|float3 UnityObjectToWorldDir (float3 dir)|把方向矢量从模型空间变换到世界空间中|
|float3 UnityWorldToObjectDir(float3 dir)|把方向矢量从世界空间变换到模型空间中|

我们建议读者在UnityCG.cginc文件找到这些函数的定义，并尝试理解它们。一些函数我们完全可以自己实现，例如UnityObjectToWorldDir和UnityWorldToObjectDir，这两个函数实际上就是对方向矢量进行了一次坐标空间变换。而UnityCG.cginc文件可以帮助我们提高代码的复用率。UnityCG.cginc还包含了很多宏，在后面的学习中，我们就会遇到它们。