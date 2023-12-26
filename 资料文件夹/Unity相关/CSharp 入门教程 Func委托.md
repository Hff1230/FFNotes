
```
Func是一种内置的泛型委托类型。其他包括`Predicate`和 `Action`。`Func`可以与方法、匿名方法或 lambda 表达式一起使用。

`Func`可以包含 0 到 16 个输入参数，并且必须具有一种返回类型。`Func`（委托 有 16 个重载。）

```csharp
public delegate TResult Func<in T1, in T2, out TResult>(T1 arg1, T2 arg2);
```

例如，此委托封装了一个具有两个参数并返回参数指定类型的值的方法`TResult`。

## C# Func 简单示例

以下示例是 C#`Func`委托的简单演示。

```csharp
string GetMessage()
{
    return "Hello there!";
}

Func<string> sayHello = GetMessage;
Console.WriteLine(sayHello());
```

在示例中，我们使用`Func`没有参数并返回单个值的委托。

```csharp
string GetMessage() 
{ 
    return "你好！"; 
}
```

这是我们在`Func` 委托的帮助下引用的函数。

```csharp
Func<string> sayHello = GetMessage;
```

我们通过委托 引用`GetMessage`函数。`Func`这`Func`有助于我们创建简洁的代码。

```csharp
Console.WriteLine(sayHello());
```

我们通过委托调用函数并打印输出。

```text
$ dotnet run
你好！
```

## 以下示例用于`Func`添加值。

```csharp
int Sum(int x, int y) 
{ 
    return x + y; 
} 

Func<int, int, int> add = Sum; 

int res = add(150, 10); 

Console.WriteLine(res);
```

我们有一个`Sum`添加两个值的方法。`Func`我们通过委托 引用该方法。

```csharp
Func<int, int, int> Add = Sum;
```

此`Func`委托接受两个参数并返回一个值。

```text
$ dotnet 运行
160
```

在以下示例中，我们使用具有三个输入参数的委托。

```csharp
int Sum(int x, int y, int z) 
{ 
    return x + y + z; 
} 

Func<int, int, int, int> add = Sum; 

int res = add(150, 20, 30); 

Console.WriteLine(res);
```

这次我们指的是一个采用三个参数的方法。

```text
$ dotnet 运行
200
```

如果没有内置`Func`委托，我们需要声明我们的自定义委托。

```csharp
int Sum(int x, int y)
{
    return x + y;
}

Add AddTwo = Sum;
int res = AddTwo(150, 10);

Console.WriteLine(res);

delegate int Add(int x, int y);
```

`Sum`在此示例中，我们通过自定义委托类型 引用方法。

## 带有 lambda 表达式的 C# Func

C# lambda 表达式简化了 C# 的创建`Funcs`。Lambda 表达式是使用`=>`lambda 声明运算符创建的。

程序.cs

```csharp
Func<int, int, int> randInt = (n1, n2) => new Random().Next(n1, n2); 
Console.WriteLine(randInt(1, 100));
```

在示例中，我们创建了一个返回随机整数的函数。委托接受随机范围的下限和上限的两个值。

## C# Func Linq 在哪里

许多 Linq 方法将`Func`委托作为参数。例如，该`Where`方法根据谓词过滤一系列值。

程序.cs

```csharp
Func<string, bool> HasThree = str => str.Length == 3; 

string[] words = 
{ 
    “天空”、“森林”、“木头”、“云”、“猎鹰”、“猫头鹰”、“海洋”、
    “水”、“弓”、“小”、“弧” 
} ; 

IEnumerable<string> threeLetterWords = words.Where(HasThree); 

foreach (var word in threeLetterWords) 
{ 
    Console.WriteLine(word); 
}
```

在示例中，我们有一个单词数组。在 `Func`代表的帮助下，我们过滤了所有包含三个字母的单词。

```csharp
Func<string, bool> HasThree = str => str.Length == 3;
```

我们声明一个`Func`变量并将一个 lambda 表达式分配给该变量。该方法检查字符串的长度并返回一个布尔值。

```csharp
IEnumerable<string> threeLetterWords = words.Where(HasThree);
```

我们根据 HasThree 方法查询数组并选择字符串。

```text
$ dotnet run
sky
owl
bow
arc
```

## C# Func 委托列表

`Func`代表可以放入容器中。

程序.cs

```csharp
var vals = new int[] { 1, 2, 3, 4, 5 }; 

Func<int, int> square = x => x * x; 
Func<int, int> 立方体 = x => x * x * x; 
函数<int, int> inc = x => x + 1; 

var fns = new List<Func<int, int>> 
{ 
    inc, square, cube 
}; 

foreach (var fn in fns) 
{ 
    var res = vals.Select(fn); 

    Console.WriteLine(string.Join(", ", res)); 
}
```

我们将三个代表`Func`列在一个列表中。我们遍历列表并将每个委托应用于数组。

```text
$ dotnet 运行
2、3、4、5、6 
1、4、9、16、25 
1、8、27、64、125
```

## C# Func 过滤器数组

在示例中，我们使用`Func`过滤用户数组。

```text
User[] users =
{
  new (1, "John", "London", "2001-04-01"),
  new (2, "Lenny", "New York", "1997-12-11"),
  new (3, "Andrew", "Boston", "1987-02-22"),
  new (4, "Peter", "Prague", "1936-03-24"),
  new (5, "Anna", "Bratislava", "1973-11-18"),
  new (6, "Albert", "Bratislava", "1940-12-11"),
  new (7, "Adam", "Trnava", "1983-12-01"),
  new (8, "Robert", "Bratislava", "1935-05-15"),
  new (9, "Robert", "Prague", "1998-03-14"),
};

var city = "Bratislava";
Func<User, bool> livesIn = e => e.City == city;

var res = users.Where(livesIn);

foreach (var e in res)
{
    Console.WriteLine(e);
}

record User(int id, string Name, string City, string DateOfBirth);
```

从众多用户中，我们得到了住在布拉迪斯拉发的用户。

```csharp
var city = "Bratislava"; 
Func<User, bool> livingIn = e => e.City == city;
```

在谓词中，我们测试所有`City`属性等于`city`变量的用户对象。

```csharp
var res = users.Where(livesIn);
```

我们将`livesIn`谓词传递给`Where`方法。

```csharp
$ dotnet run 
User { id = 5 , Name = Anna , City = Bratislava , DateOfBirth = 1973 - 11 - 18 } 
User { id = 6 , Name = Albert , City = Bratislava , DateOfBirth = 1940 - 12 - 11 } 
User { id = 8，姓名 = 罗伯特，城市 = 布拉迪斯拉发，出生日期 = 1935-05-15 }
```

## C# Func 按年龄过滤

我们将按年龄过滤列表。

```text
var users = new List<User>
{
  new (1, "John", "London", "2001-04-01"),
  new (2, "Lenny", "New York", "1997-12-11"),
  new (3, "Andrew", "Boston", "1987-02-22"),
  new (4, "Peter", "Prague", "1936-03-24"),
  new (5, "Anna", "Bratislava", "1973-11-18"),
  new (6, "Albert", "Bratislava", "1940-12-11"),
  new (7, "Adam", "Trnava", "1983-12-01"),
  new (8, "Robert", "Bratislava", "1935-05-15"),
  new (9, "Robert", "Prague", "1998-03-14"),
};

var age = 60;
Func<User, bool> olderThan = e => GetAge(e) > age;

var res = users.Where(olderThan);

foreach (var e in res)
{
    Console.WriteLine(e);
}

int GetAge(User user)
{    
    var dob = DateTime.Parse(user.DateOfBirth);
    return (int) Math.Floor((DateTime.Now - dob).TotalDays / 365.25D);
}

record User(int id, string Name, string City, string DateOfBirth);
```

我们让所有超过 60 岁的用户。

```csharp
Func<User, bool> oldThan = e => GetAge(e) > age;
```

在`Func`定义中，我们使用`GetAge`方法来确定用户的年龄。

```csharp
var res = users.Where(olderThan);
```

该`olderThan`功能适用​​于`Where`。

```csharp
int GetAge(User user) 
{     
    var dob = DateTime.Parse(user.DateOfBirth); 
    return (int) Math.Floor((DateTime.Now - dob).TotalDays / 365.25D); 
}
```

该`GetAge`方法解析出生日期字符串并计算当前年龄。

```text
$ dotnet run     
User { id = 4 , Name = Peter , City = Prague , DateOfBirth = 1936 - 03 - 24 } 
User { id = 6 , Name = Albert , City = Bratislava , DateOfBirth = 1940 - 12 - 11 } 
User { id = 8，姓名 = 罗伯特，城市 = 布拉迪斯拉发，出生日期 = 1935-05-15 }
```

## C# 谓词

`Predicate`是 的一个专业`Func`。可以`Predicate`用`Func`.

谓词表示返回布尔值的单参数函数。

```csharp
User[] users =
{
  new (1, "John", "London", "2001-04-01"),
  new (2, "Lenny", "New York", "1997-12-11"),
  new (3, "Andrew", "Boston", "1987-02-22"),
  new (4, "Peter", "Prague", "1936-03-24"),
  new (5, "Anna", "Bratislava", "1973-11-18"),
  new (6, "Albert", "Bratislava", "1940-12-11"),
  new (7, "Adam", "Trnava", "1983-12-01"),
  new (8, "Robert", "Bratislava", "1935-05-15"),
  new (9, "Robert", "Prague", "1998-03-14"),
};

var age = 60;
Predicate<User> olderThan = e => GetAge(e) > age;

var res = Array.FindAll(users, olderThan);

foreach (var e in res)
{
    Console.WriteLine(e);
}

int GetAge(User user)
{    
    var dob = DateTime.Parse(user.DateOfBirth);
    return (int) Math.Floor((DateTime.Now - dob).TotalDays / 365.25D);
}

record User(int id, string Name, string City, string DateOfBirth);
```

我们得到所有 60 岁以上的用户。

```text
Predicate<User> olderThan = e => GetAge(e) > age;
```

在 a`Predicate`中，我们跳过返回值，它始终是 a `bool`。

```csharp
var res = Array.FindAll(users, oldThan);
```

该`Array.FindAll`方法检索与指定谓词定义的条件匹配的所有元素。

```csharp
int GetAge(User user) 
{     
    var dob = DateTime.Parse(user.DateOfBirth); 
    return (int) Math.Floor((DateTime.Now - dob).TotalDays / 365.25D); 
}
```

该`GetAge`方法解析出生日期字符串并计算当前年龄。

```text
$ dotnet run 
User { id = 4 , Name = Peter , City = Prague , DateOfBirth = 1936 - 03 - 24 } 
User { id = 6 , Name = Albert , City = Bratislava , DateOfBirth = 1940 - 12 - 11 } 
User { id = 8，姓名 = 罗伯特，城市 = 布拉迪斯拉发，出生日期 = 1935-05-15 }
```

## C# 将 Func 作为参数传递

在下一个示例中，我们将`Func`委托传递给一个方法。

程序.cs

```csharp
var data = new List<Person> 
{ 
    new ("John Doe", "gardener"), 
    new ("Robert Brown", "programmer"), 
    new ("Lucia Smith", "teacher"), 
    new ("Thomas Neuwirth ", "老师") 
}; 

ShowOutput(data, r => r.Occupation == "老师"); 

void ShowOutput(List<Person> list, Func<Person, bool> condition) 
{ 
    var data = list.Where(condition); 

    foreach (var person in data) 
    { 
        Console.WriteLine("{0}, {1}", person.Name, person.Occupation); 
    } 
}

record Person(string Name, string Occupation);
```

该示例创建人员列表。该`ShowOutput`方法将 a`Func`作为第二个参数。它返回所有教师。

```csharp
void ShowOutput(List<Person> list, Func<Person, bool> condition)
```

我们将 a 传递`Func`给该`ShowOutput`方法。方法不能作为函数参数传递，只能作为委托传递。

```csharp
$ dotnet run 
Lucia Smith，老师
Thomas Neuwirth，老师
```

## C# Func 组合

我们可以`Funcs`通过链式组合。

```csharp
var vals = new int[] { 1, 2, 3, 4, 5 };

Func<int, int> inc = e => e + 1;
Func<int, int> cube = e => e * e * e;

var res = vals.Select(inc).Select(cube);

foreach (var e in res)
{
    Console.WriteLine(e);
}
```
```