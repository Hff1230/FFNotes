[linux man手册](https://man7.org/linux/man-pages/man5/proc.5.html#NAME)

查看内存
查看当前进程：
adb shell ps -ef
adb shell ps -ef | grep 包名

查看内存
adb shell getprop dalvik.vm.heapsize // heapsize参数表示单个进程可用的最大内存，表示不受控情况下的极限堆
adb shell getprop dalvik.vm.heapgrowthlimit // 以heapgrowthlimit为准，超过则OOM
[adb shell getprop](https://gist.github.com/abhisada/25c0bc679c8e90bd8f52310ceb841ae2)

adb shell cat /proc/meminfo
MemTotal：Total usable RAM (i.e., physical RAM minus a few，reserved bits and the kernel binary code).
VmallocTotal：Total size of vmalloc memory area.

adb shell dumpsys meminfo -a 包名，查看当前应用所占用内存
Uptime：表示启动到现在的时长，不包含休眠的时间，单位毫秒(ms)
Realtime：表示启动到现在的时长，包含休眠的时间，单位毫秒(ms)
Native Heap: 进程<程序>本身使用的内存
Dalvik Heap : 虚拟机VM使用的内存
Dalvik Other : 虚拟机VM之外的内存（比如Java的GC内存）
Stack：应用中的原生堆栈和 Java 堆栈使用的内存
Pss Total: 应用程序真实占用了物理内存的空间
Heap Alloc : 程序虚拟已使用的内存
Heap Size：程序堆的总内存
Heap Free : 空闲的内存
private dirty : 私用共享内存
Private（Clean和Dirty的）：应用进程单独使用的内存，代表着系统杀死你的进程后可以实际回收的内存总量。通常需要特别关注其中更为昂贵的dirty部分，它不仅只被你的进程使用而且会持续占用内存而不能被从内存中置换出存储。申请的全部Dalvik和本地heap内存都是Dirty的，和Zygote共享的Dalvik和本地heap内存也都是Dirty的。
Dalvik Heap：Dalvik虚拟机使用的内存，包含dalvik-heap和dalvik-zygote，堆内存，所有的Java对象实例都放在这里。
Heap Alloc：累加了Dalvik和Native的heap。
PSS：这是加入与其他进程共享的分页内存后你的应用占用的内存量，你的进程单独使用的全部内存也会加入这个值里，多进程共享的内存按照共享比例添加到PSS值中。如一个内存分页被两个进程共享，每个进程的PSS值会包括此内存分页大小的一半在内。
Dalvik Pss内存 = 私有内存Private Dirty + （共享内存Shared Dirty / 共享进程数）
TOTAL：上面全部条目的累加值，全局的展示了你的进程占用的内存情况。
ViewRootImpl：应用进程里的活动窗口视图个数，可以用来监测对话框或者其他窗口的内存泄露。
AppContexts及Activities：应用进程里Context和Activity的对象个数，可以用来监测Activity的内存泄露。
[官方文档](https://developer.android.com/studio/command-line/dumpsys#ViewingAllocations)

adb shell run-as 包名 cat /proc/pid/maps
查看so虚拟内存大小

查看cpu
adb shell cat /proc/cpuinfo，查看cpu硬件信息

adb shell cat /proc/stat
user (1) Time spent in user mode.
nice (2) Time spent in user mode with low priority (nice).
system (3) Time spent in system mode.

adb shell ps -t -c -p -x pid，查看线程信息
PPID 父进程ID
VSIZE 进程虚拟地址空间大小
RSS 进程正在使用物理内存大小
用户态和内核态时间(单位s) u:130, s:12
[ps进程命令](http://gityuan.com/2015/10/11/ps-command/)
[Linux进程状态解析之R、S、D、T、Z、X](https://blog.csdn.net/nilxin/article/details/7437671)

adb shell top -m 10 -s cpu(-m显示最大数量，-s 按指定行排序)
PID : 应用程序ID
PR 在android N之前代表运行在哪个核上，在android N上代表优先级，当然可能设备厂商会进行自定义
S : 进程的状态（S表示休眠，R表示正在运行，Z表示僵死状态，N表示该进程优先值是负数）
#THR : 程序当前所用的线程数
VSS : 虚拟耗用内存（包含共享库占用的内存）
RSS : 实际使用物理内存（包含共享库占用的内存）
PCY : 前台(fg)和后台(bg)进程
UID : 用户身份ID
Name : 应用程序名称

adb shell top -t -m 10 -s cpu(-t显示线程，-m显示最大数量，-s 按指定行排序)

[获取cpu使用率](https://juejin.cn/post/7061788020134920206)

其他指令
adb logcat ‘*:E’
adb查看错误日志；在zshrc文件中添加 setopt no_nomatch

adb monkey test:
adb shell monkey -p your.package.name -v 500

输出线程trace，需要root，排查线程问题
adb shell debuggerd -b [tid]
[Android打印Trace堆栈](http://gityuan.com/2017/07/09/android_debug/)

adb shell dumpsys activity top
adb shell dumpsys activity 包名
查看指定包名当前窗口显示布局结构信息，可以查看当前activity布局

adb shell logcat | grep ActivityManager
查看ActivityManager日志

adb shell getprop ro.product.cpu.abi
查看cpu架构

adb shell cat proc/[pid]/statm
查看进程占用虚拟内存、物理内存大小；
Size (pages) 任务虚拟地址空间的大小 VmSize/4
Resident(pages) 应用程序正在使用的物理内存的大小 VmRSS/4
Shared(pages) 共享页数 0
Trs(pages) 程序所拥有的可执行虚拟内存的大小 VmExe/4
Lrs(pages) 被映像到任务的虚拟内存空间的库的大小 VmLib/4
Drs(pages) 程序数据段和用户态的栈的大小 （VmData+ VmStk ）4

adb pull和adb push
adb pull <remote> <local>
adb push <local> <remote>
adb pull /sdcard/mine.jpg ~/Desktop/
adb push xxx.txt /sdcard/a.txt

签名相关

查看keystore的信息
keytool -list -keystore demo.keystore -alias mykey -v
查看keystore的公钥证书信息
keytool -list -keystore demo.keystore -alias mykey -rfc
（注：获取Base64格式的公钥证书，RFC 1421）
查看apk的签名信息
jarsigner -verify -verbose -certs <your_apk_path.apk>
adb查看屏幕分辨率
adb shell wm size
adb shell dumpsys window | WINDOW MANAGER DISPLAY CONTENTS

adb 安装包
adb install -r -d -f apk_path

adb应用后台模拟清除内存
adb shell am kill 包名

adb设置logcat缓冲区大小
adb shell setprop persist.logd.size 8M

dumpsys系统服务
adb shell dumpsys -l

查看当前运行时的activity
adb shell dumpsys activity | grep “mFocusedActivity”

参考：
Monkey工具
