

**原理：**

    编写的几乎每个程序都需要循环访问集合。因此需要编写代码来检查集合中的每一项。还需创建迭代器方法，这些方法可为该类的元素生成迭代器。迭代器是遍历容器的对象，尤其是列表。

foreach语句是被设计用来和可枚举类型一起使用，只要它的遍历对象是可枚举类型（实现了IEnumerable）。调用过程如下：

1. 调用GetEnumerator()方法，返回一个IEnumerator引用。
    
2. 调用返回的IEnumerator接口的MoveNext()方法。
    
3. 如果MoveNext()方法返回true，就使用IEnumerator接口的Current属性获取对象的一个引用，用于foreach循环。
    
4. 重复前面两步，直到MoveNext()方法返回false为止，此时循环停止。
    

比如下面这段代码：

```
var arr= new List<int> { 1, 2 };
 foreach (var i in arr)
 {
     Console.WriteLine(i);
 }
```

编译过来实际执行是：

```
var arr= new List<int> { 1, 2 };
 IEnumerator<int> enumeratorLst = arr.GetEnumerator();
 while (enumeratorLst.MoveNext())
 {
     Console.WriteLine(enumeratorLst.Current);
 }
```

**迭代跟for循环区别**

    for循环和迭代器有本质的不同，for循环是最基础的循环语法for循环,是调用get(i)取得元素，而迭代器是遍历容器的对象，可以用迭代器foreach执行循环。如果用foreach迭代非数组，则IL底层执行的还是for循环。

    for可以用于任何行为复制，在循环体中可以进行任何操作，foreach只能用于遍历，遍历期间不能更改循环目标，执行效率较高。

    有下标的数组对象用for循环效率更高，迭代器foreach用于只要读取不用更改的效率更高，也有人测试他们之间的效率差不多。如果用迭代器迭代[]数组，C#编译器会转成for循环的形式运行，感兴趣的小伙伴可以写一写查看中间语言试一试。