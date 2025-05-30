
我们通常在Unity Shader中使用Cg作为着色器编程语言。在Cg中变量类型有很多种，但在本节我们是想解释如何使用这些类型进行数学运算。因此，我们只以float家族的变量来做说明。

在Cg中，矩阵类型是由float3x3、float4x4等关键词进行声明和定义的。而对于float3、float4等类型的变量，我们既可以把它当成一个矢量，也可以把它当成是一个1×_n_ 的行矩阵或者一个_n_ ×1的列矩阵。这取决于运算的种类和它们在运算中的位置。例如，当我们进行点积操作时，两个操作数就被当成矢量类型，如下：

```
float4 a = float4(1.0, 2.0, 3.0, 4.0);
float4 b = float4(1.0, 2.0, 3.0, 4.0);
// 对两个矢量进行点积操作
float result = dot(a, b);
```

但在进行矩阵乘法时，参数的位置将决定是按列矩阵还是行矩阵进行乘法。在Cg中，矩阵乘法是通过mul函数实现的。例如：

```
float4 v = float4(1.0, 2.0, 3.0, 4.0);
float4x4 M = float4x4(1.0, 0.0, 0.0, 0.0,
                      0.0, 2.0, 0.0, 0.0,
                      0.0, 0.0, 3.0, 0.0,
                      0.0, 0.0, 0.0, 4.0);
// 把v当成列矩阵和矩阵M进行右乘
float4 column_mul_result = mul(M, v);
// 把v当成行矩阵和矩阵M进行左乘
float4 row_mul_result = mul(v, M);
// 注意：column_mul_result不等于row_mul_result，而是：
// mul(M,v) == mul(v, tranpose(M))
// mul(v,M) == mul(tranpose(M), v)
```

因此，参数的位置会直接影响结果值。通常在变换顶点时，我们都是使用右乘的方式来按列矩阵进行乘法。这是因为，Unity提供的内置矩阵（如UNITY_MATRIX_MVP等）都是按列存储的。但有时，我们也会使用左乘的方式，这是因为可以省去对矩阵转置的操作。

需要注意的一点是，Cg对矩阵类型中元素的初始化和访问顺序。在Cg中，对float4x4等类型的变量是按行优先的方式进行填充的。什么意思呢？我们知道，想要填充一个矩阵需要给定一串数字，例如，如果需要声明一个3×4的矩阵，我们需要提供12个数字。那么，这串数字是一行一行地填充矩阵还是一列一列地填充矩阵呢？这两种方式得到的矩阵是不同的。例如，我们使用(1, 2, 3, 4, 5, 6, 7, 8, 9)去填充一个3×3的矩阵，如果是按照行优先的方式，得到的矩阵是：
![[Pasted image 20241017170609.png]]
Cg使用的是行优先的方法，即是一行一行地填充矩阵的。因此，如果读者需要自己定义一个矩阵时（例如，自己构建用于空间变换的矩阵），就要注意这里的初始化方式。

类似地，当我们在Cg中访问一个矩阵中的元素时，也是按行来索引的。例如：

```
// 按行优先的方式初始化矩阵M
float3x3 M = float3x3(1.0, 2.0, 3.0,
                      4.0, 5.0, 6.0,
                      7.0, 8.0, 9.0);
// 得到M的第一行，即(1.0, 2.0, 3.0)
float3 row = M[0]; 

// 得到M的第2行第1列的元素，即4.0
float ele = M[1][0];
```

之所以Unity Shader中的矩阵类型满足上述规则，是因为使用的是Cg语言。换句话说，上面的特性都是Cg的规定。

如果读者熟悉Unity的API，可能知道Unity在脚本中提供了一种矩阵类型——Matrix4x4。脚本中的这个矩阵类型则是采用列优先的方式。这与Unity Shader中的规定不一样，希望读者在遇到时不会感到困惑。