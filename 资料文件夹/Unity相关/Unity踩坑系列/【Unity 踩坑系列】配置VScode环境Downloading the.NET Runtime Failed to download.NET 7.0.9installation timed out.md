
 https://blog.csdn.net/JavaD0g/article/details/132127940
 
1.问题描述
在最近使用Unity配置VScode开发环境时，总会出现以下的情况。(很多朋友其实本地已经自己安装好了.net环境 PS:可能各种版本.net 6.0 - .net 8.0都试过安装了 但就是会自动下载最新版本的.net )


Downloading the .NET Runtime.
Downloading .NET version(s) 7.0.9 .................................................................................................................. Error!
Failed to download .NET 7.0.9:
.NET installation timed out.
Error!
.NET Acquisition Failed: Installation failed: Error: .NET installation timed out.

其中的根本原因就是我们的VScode C#扩展插件没有检测到本地的.net 环境从而导致自动下载最新版本的.net runtime

2.解决方法
1.在我们本地自行下载并安装好了对应版本的.net
2.打开VScode的 扩展插件栏 Extensions
3.按照下图流程找到.NET Install Tool for Extension Authors并打开对于的Extension settings

4.找到Edit in settings.json 按钮

5.打开Json文件后，出现问题的原因就是因为原本的dotnetPath当中没有对应的路径配置（如下图所示）

6.此时我们就要加上我们自己dotnet环境变量的路径配置（如下图所示PS：正常默认的安装的dotnet环境变量路径都是下图这样，自己调整过的就需要找到正确的路径才可以）

下列是对应的路径配置Json

{
    "dotnetAcquisitionExtension.existingDotnetPath": [
        {
	        "extensionId": "ms-dotnettools.csharp",
	        "path": "C:\\Program Files\\dotnet\\dotnet.exe"
	    },
	    {
	        "extensionId": "visualstudiotoolsforunity.vstuc",
	        "path": "C:\\Program Files\\dotnet\\dotnet.exe"
	    }
    ]
}
7.保存文件后关闭VScode，再次打开就会发现问题解决了！（不再自动下载dotnet runtime）


3.引用文献
这个问题估计是VScode C#插件或者.NET Install Tool for Extension Authors插件新版本更新后的bug，是最近这段时间才出现的，所以在网上相关的资料和解决方案都比较少。所以最终还是在dotnet的官方GitHub下找到了这几天官方给出的对应答复解决的问题

dotnet/vscode-csharp Disable .NET Runtime auto-downloading #6029
dotnet/vscode-csharp Why do you always fail to donwload with new version 2.0 #6004
dotnet/vscode-csharp New version tries to download .NET 7 (even though it’s already installed) and fails #6009
4.补充内容
文章也发出来一段时间了，但看评论好像还是有部分网友的问题明天得到解决，于是我自己也继续研究了一下，发现还有一个原因即使.net环境变量配好了和.NET Install Tool for Extension Authors插件的setting.json配置好了也会自动下载。
问题还没有解决的朋友可以把VScode设置里的Use Modern Net选项取消勾选即可解决问题.
具体操作可以来看一下这篇文章
【Unity 踩坑系列】配置VScode环境Downloading the.NET Runtime Failed to download问题解决后续！！！

 https://blog.csdn.net/JavaD0g/article/details/132127940