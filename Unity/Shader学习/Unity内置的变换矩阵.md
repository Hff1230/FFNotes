
| 变量名                | 描述                                                                |
| ------------------ | ----------------------------------------------------------------- |
| UNITY_MATRIX_MVP   | 当前的模型观察投影矩阵，用于将顶点/方向矢量从模型空间变换到裁剪空间                                |
| UNITY_MATRIX_MV    | 当前的模型观察矩阵，用于将顶点/方向矢量从模型空间变换到观察空间                                  |
| UNITY_MATRIX_V     | 当前的观察矩阵，用于将顶点/方向矢量从世界空间变换到观察空间                                    |
| UNITY_MATRIX_P     | 当前的投影矩阵，用于将顶点/方向矢量从观察空间变换到裁剪空间                                    |
| UNITY_MATRIX_VP    | 当前的观察投影矩阵，用于将顶点/方向矢量从世界空间变换到裁剪空间                                  |
| UNITY_MATRIX_T_MV  | UNITY_MATRIX_MV的转置矩阵                                              |
| UNITY_MATRIX_IT_MV | UNITY_MATRIX_MV的逆转置矩阵，用于将法线从模型空间变换到观察空间，也可用于得到UNITY_MATRIX_MV的逆矩阵 |
| _Object2World      | 当前的模型矩阵，用于将顶点/方向矢量从模型空间变换到世界空间                                    |
| _World2Object      | _Object2World的逆矩阵，用于将顶点/方向矢量从世界空间变换到模型空间                          |

把顶点或方向矢量从观察空间变换到模型空间，我们可以使用类似下面的代码：
```
// 方法一：使用transpose函数对UNITY_MATRIX_IT_MV进行转置，
// 得到UNITY_MATRIX_MV的逆矩阵，然后进行列矩阵乘法，
// 把观察空间中的点或方向矢量变换到模型空间中
float4 modelPos = mul(transpose(UNITY_MATRIX_IT_MV), viewPos);

// 方法二：不直接使用转置函数transpose，而是交换mul参数的位置，使用行矩阵乘法
// 本质和方法一是完全一样的
float4 modelPos = mul(viewPos, UNITY_MATRIX_IT_MV);
```
