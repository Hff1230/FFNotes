```
**1.为何要有unsafe**

    也许是为了实现CLR类型安全的目标吧，默认情况下，C#没有提供指针的使用算法，但是有些情况下也可能需要指针这样直接访问内存的东西(虽然目前我还没有用过)，但是有时候程序员非常清楚程序的运行状况，需要使用指针直接访问内存以便于提高性能或者调试、监控程序运行的内存的使用状况，以便于采取相应的措施。还有一些情况是当我们需要调用外面DLL中的函数又不能使用DllImport 时，也需要指针来传递这些函数。

**2.unsafe 的定义**

    MSDN：**unsafe** 关键字表示不安全上下文，该上下文是任何涉及指针的操作所必需的。

    其实，意思就是要使用指针前，请用unsafe 声明下，可以使类、方法，成员，类全局变量和代码段，但不能修饰成员函数内部的局部变量，具体为什么不清楚，还望大神指点。

　 在使用unsafe之前，我们必须先看一段MSDN的话：在公共语言运行时 (CLR) 中，不安全代码是指无法验证的代码。 C# 中的不安全代码不一定是危险的；只是其安全性无法由 CLR 进行验证的代码。 因此，CLR 只对在完全受信任的程序集中的不安全代码执行操作。 如果使用不安全代码，由您负责确保您的代码不会引起安全风险或指针错误。

    因此，我们在运行unsafe 代码是要在项目属性-生成选项里配置下"允许运行不安全代码"。先看下简单的例子：

unsafe static void ChangeValue(int* pData)  
{  
    *pData = 200; //修改所在地址值  
}  
unsafe static void Main()  
{  
    int data = 100;  
    Console.WriteLine("原始值: {0}", data);  
    ChangeValue(&data);    //取data地址并传递  
    Console.WriteLine("改变地址后: {0}", data);  
  
    Console.ReadLine();  
}  

程序输出:

_原始值：100_

_修改地址后：200_

**3、引入fixed**

      当我们讨论fixed的时候，不得不先了解下，托管代码和非托管代码，所谓托管代码就是由CLR去执行的代码而不是操作系统去执行的代码，而非托管代码就是绕过CLR，由操作系统直接执行，它有自己的垃圾回收、类型安全检查等服务。

      而不安全代码就是允许自己使用指针访问内存，但同时又要使用CLR提供的垃圾回收机制、类型安全检查等服务，有的资料认为是介于CLR和非托管代码之间的一种代码运行机制，也可以理解。

      正因为如此，我们自定义的指针地址就有可能被CLR垃圾回收机制重新调整位置，所以就引入了fixed ，MSDN对fixed的解释是：**fixed 语句设置指向托管变量的指针，并在执行该语句期间"固定"此变量。**这样就可以防止变量的重定位。

      看下代码的演示：

class PointerDemo  
{  
　　public int x, y;  
}  
class Program  
{  
　　unsafe static void ChangeValue(int* x, int* y)  
　　{  
　　　　*x = 200; //修改所在地址值  
　　　　*y = 300;  
　  }  
　　unsafe static void Main()  
　　{  
　　　　var obj = new PointerDemo();  
　　　　Console.WriteLine("原始值: {0}, {1}", obj.x, obj.y);    
　　　　fixed (int* n = &obj.x)  
　　　　{  
　　　　　　fixed (int* p = &obj.y)  
　　　　　　{  
　　　　　　　　ChangeValue(n, p); //取data地址并传递  
　　　　　　}  
　　　　}  
　　　　Console.WriteLine("改变地址后: {0}, {1}", obj.x, obj.y);   
　　　　Console.ReadLine();   
　　}  
}
```