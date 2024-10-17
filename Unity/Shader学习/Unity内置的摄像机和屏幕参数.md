
| 变量名                            | 类型       | 描述                                                                                                                     |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| _WorldSpaceCameraPos           | float3   | 该摄像机在世界空间中的位置                                                                                                          |
| _ProjectionParams              | float4   | _x_ = 1.0（或−1.0，如果正在使用一个翻转的投影矩阵进行渲染），_y_ = Near，_z_ = Far，_w_ = 1.0 + 1.0/Far，其中Near和Far分别是近裁剪平面和远裁剪平面和摄像机的距离          |
| _ScreenParams                  | float4   | _x_ = width，_y_ = height，_z_ = 1.0 + 1.0/width，_w_= 1.0 + 1.0/height，其中width和height分别是该摄像机的渲染目标（render target）的像素宽度和高度 |
| _ZBufferParams                 | float4   | _x_ = 1− Far/Near，_y_ = Far/Near，_z_ = x/Far，_w_= y/Far，该变量用于线性化Z缓存中的深度值（可参考13.1节）                                     |
| unity_OrthoParams              | float4   | _x_ = width，_y_ = heigth，_z_ 没有定义，_w_ = 1.0（该摄像机是正交摄像机）或_w_ = 0.0（该摄像机是透视摄像机），其中width和height是正交投影摄像机的宽度和高度             |
| unity_CameraProjection         | float4x4 | 该摄像机的投影矩阵                                                                                                              |
| unity_CameraInvProjection      | float4x4 | 该摄像机的投影矩阵的逆矩阵                                                                                                          |
| unity_CameraWorldClipPlanes[6] | float4   | 该摄像机的6个裁剪平面在世界空间下的等式，按如下顺序：左、右、下、上、近、远裁剪平面                                                                             |
