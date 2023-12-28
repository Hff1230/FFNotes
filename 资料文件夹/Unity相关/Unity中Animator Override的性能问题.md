![Unity中Animator Override的性能问题](https://pic1.zhimg.com/70/v2-14f9c19a9b85bfde68d0e2e591004987_1440w.image?source=172ae18b&biz_tag=Post)

# Unity中Animator Override的性能问题



学习是一个发现自己有多无知的过程

## 前言

本文内容来自于Unity官方的**高川老师**的分享，视频内容链接如下（空降42:30即可）：

[Unity X 永劫无间「Unity大咖作客」线上分享会 — 动作动画专场【回放】_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili​www.bilibili.com/video/BV1QN411f7WJ?t=197![](https://pic2.zhimg.com/v2-f2f71ab463b1eb006e9d0b602cb74625_180x120.jpg)](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1QN411f7WJ%3Ft%3D197)

个人也是非常崇拜和喜欢高川老师的，分享的东西都很干，人也很幽默，说话又好听~哈哈。下面链接是之前高川老师分享的Unity内存管理，没看过的一定要去看一下：

[浅谈Unity内存管理_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili​www.bilibili.com/video/BV1aJ411t7N6![](https://pic1.zhimg.com/v2-1facec34ab9437b536824d6dc92fb1f8_180x120.jpg)](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1aJ411t7N6)

附笔记：

[王江荣：Unity的内存管理与性能优化166 赞同 · 13 评论文章](https://zhuanlan.zhihu.com/p/362941227)

---

我们先来看看什么是Animator Override。假设我们有个多个不同的角色，他们都有相同的动作，例如待机，跑步，攻击等等，并且触发条件也都相同。但是为了区分角色，他们相同的动作对应的动画往往都不相同，例如下图不同的跑步动画：

![动图封面](https://pic1.zhimg.com/v2-de53af679297b89946def49762e45928_b.jpg)

跑步动画不同

也就是说有n个角色，他们的State都相同，但是对应的AnimationClip各不相同。那么我们需要创建多个不同的AnimatorController，然后里面搞一堆一样的State去关联不同的AnimationClip么？

不，不需要这么愚蠢的做法，AnimatorOverrideController可以帮助我们。

  

## AnimatorOverrideController

官方文档：

[https://docs.unity3d.com/2020.2/Documentation/ScriptReference/AnimatorOverrideController.html​docs.unity3d.com/2020.2/Documentation/ScriptReference/AnimatorOverrideController.html](https://link.zhihu.com/?target=https%3A//docs.unity3d.com/2020.2/Documentation/ScriptReference/AnimatorOverrideController.html)

我们可以在Project下右键Create->Animator Override Controller来创建它，其Inspector界面如下：

![](https://pic4.zhimg.com/80/v2-7174d2b8952a4a4e23e1e2b8c198242f_720w.webp)

AnimatorOverrideController

如图，我们可以为AnimatorOverrideController指定一个AnimatorController，然后下面的列表里就会显示这个AnimatorController里的所有State，我们可以选择新的AnimatorClip去关联这些State。

这样就解决了我们上面所说的问题，也就是说我们可以创建一个通用的AnimatorController，然后n个角色创建不同的AnimatorOverrideController去关联它。根据不同的角色指定不同的AnimatorClip，最后在不同角色的Animator组件里指定AnimatorOverrideController即可。

也就是说AnimatorOverrideController可以在不改变AnimatorController里State，Layer，Transition和一些参数的情况下，更改State里的AnimatorClip。类似于类的继承，从Override这个词就能看出。

  

## 动态修改State里的AnimatorClip

AnimatorController是不支持我们在运行时修改State里的AnimatorClip的，但是利用AnimatorOverrideController的话，我们也可以实现运行时修改。

原理就是新建一个AnimatorOverrideController，继承我们原本的AnimatorController，然后修改对应State的AnimatorClip，最后将这个AnimatorOverrideController关联到Animator组件上即可。

简单的代码如下：

```csharp
Animator animator = GetComponent<Animator>();
AnimatorOverrideController overrideController = new AnimatorOverrideController();
overrideController.runtimeAnimatorController = animator.runtimeAnimatorController;
overrideController["name"] = newAnimationClip;
animator.runtimeAnimatorController = overrideController;
```

---

好了，关于AnimatorOverrideController的简单介绍差不多了，回到正文。

如果我们项目里使用了Animator方案，那么一定会对Override的性能有一个深刻的了解。尤其是当State或者是Animatorclip的附加程度非常非常复杂的时候，例如一些动作游戏有上千个State，那么Override一定会成为一个性能优化上的热点。

  

## Demo

我们通过一个Demo来看下Override的问题，如下图我们场景中有一个角色：

![](https://pic4.zhimg.com/80/v2-3e4bf093d86104ff8d150d60ed9ef9cf_720w.webp)

注：这个角色名叫 **unity-chan** ，大家可以在AssetStore里免费的下载，它的由来还是蛮有意思的，只能说小日...小日子过得不错的日本人有趣啊。

这个角色自然有它的Animator组件，关联了一个AnimatorController，如下：

![](https://pic4.zhimg.com/80/v2-cd68dfacea7769e10b8825a17ae547ab_720w.webp)

BaseLayer层

![](https://pic2.zhimg.com/80/v2-0436a363a80b781b63df3dd714008159_720w.webp)

Face层

其中在Base层里，我们新增了一个名为Test的State，里面关联了一个名为dummy的AnimationClip，它其实就是新建的一个空的AnimationClip。

![](https://pic4.zhimg.com/80/v2-a95e0e67771ea58f4878971344237f2b_720w.webp)

Test State

接下来我们要做一个操作，即利用AnimatorOverrideController，在运行时修改Test里的AnimationClip，换成一个原本的Wait的动作，代码很简单如下：

```csharp
public class NewBehaviourScript : MonoBehaviour
{
    public AnimationClip Clip;
    public Animator animator;
    public Button normalBtn;
    
    void Start()
    {
        normalBtn.onClick.AddListener(OnNormalClicked);
    }

    void OnNormalClicked()
    {
        UnityEngine.Profiling.Profiler.BeginSample("OverrideAnimator");
        
        AnimatorOverrideController overrideController = new AnimatorOverrideController();
        overrideController.runtimeAnimatorController = animator.runtimeAnimatorController;
        overrideController["dummy"] = Clip;
        animator.runtimeAnimatorController = overrideController;
        
        UnityEngine.Profiling.Profiler.EndSample();
    }
}
```

运行效果为：

![动图封面](https://pic2.zhimg.com/v2-6d87ce5c13462543fdd3e6fcc5fa5b59_b.jpg)

  

可以发现，我们在代码里加了一个[Profiling.Profiler.BeginSample](https://link.zhihu.com/?target=https%3A//docs.unity3d.com/2020.2/Documentation/ScriptReference/Profiling.Profiler.BeginSample.html)和EndSample的方法，它们可以帮助我们**在Profiler里面打一个Tag**，更好的观察代码所消耗的性能。

我们来看下Overrider这步一共花了多久，在Profiler里找到我们打的名为OverrideAnimator的Tag，如下图：

![](https://pic4.zhimg.com/80/v2-c8305083baa5ac3224c4b9cb81538627_720w.webp)

大概是1ms。接下来我们再做这样的一个操作，将这个AnimatorController里的Face Layer里的State复制黏贴多份，如下图：

![](https://pic1.zhimg.com/80/v2-06d64d052670c1255e324d6c5cf5dbf8_720w.webp)

Face层复制黏贴State

然后我们再来运行一下原来的代码，看看耗时，如下图：

![](https://pic4.zhimg.com/80/v2-6aea83d591e16e6d7387d0ce1ba39797_720w.webp)

此时会发现，耗时从1ms变成了1.5ms。也就是说**在做Override操作的时候，消耗的性能会随着AnimatorController里State数量的增加而增加，即是我们并不去使用它们。这个问题就是Override存在的性能热点。**

  

## 问题的本质

在Profiler里的Override下我们可以发现一个相当长的时间，但是无法看见更详细的信息，只能在后面看见一个SetupControllerDataSet的信息。如下图：

![](https://pic1.zhimg.com/80/v2-635f0d06c743e0e693341e764ea0bcf4_720w.webp)

这里，高川老师在分享里，为我们揭开了它的神秘面纱。即在这些时间里**Unity会尝试把AnimatorController里所有的State合并到一个名为 Animationset 的数据结构中**。这意味着所有的AnimationClip再乘上所有Clip里所用的曲线都要经过一系列的运算。因此我们的State和AnimationClip越多越复杂，这个运算的耗时也会增加，导致性能问题。

  

## AnimationClip's Curve

前面提到了AnimationClip的曲线，这是啥呢？我们来随便挑一个AnimationClip看一看它的Inspector界面，如下图：

![](https://pic2.zhimg.com/80/v2-79bda2940d35f3d0e966d12be0849abd_720w.webp)

**在Unity中每个AnimationClip都会有一些曲线数，它们对于优化来讲是有意义的**。例如上图中Curves Total：322说明一共有322个曲线，Curves Pos：4指的是位置信息相关的曲线有4个，然后还有四元数相关的曲线Curves Quaternion等等。

**这些曲线在做Override操作的时候都会参与到前面所说的合并到Animationset数据结构的运算当中**。例如我们有10个AnimationClip，每个有300个曲线，那么就是3000次运算。

其中比较特殊的是Curves Constant，即**Constant曲线**，我们可以在图中看出它后面还跟了个百分比的数值，即它在所有曲线中的占比情况。**对于Constant曲线我们可以理解成在内存中只需要保存一个数即可，而不需要保存整个曲线的数据。**而其他的曲线，例如Pos，Quaternion这些，是要进过一系列的合并运算的，也就是说这些曲线在后期采样的时候是会真正参与运算的。而Constant曲线可以认为是以一个常数的形式去参与这些运算，因此带来的性能消耗并不大。因此Constant曲线的比值越高，那么在刚刚那个计算的时候，需要进行的计算就会相对少一些。

总结来说，曲线数和Override时的耗能大致上是一个**线性关系**，即运算越多，消耗越多。当我们的State越多，曲线越复杂，不管是否参与到运行时的最终表现中，它都是会在Override的时候产生性能消耗，并且每次Override的时候都会重复一次**CreateAnimationSet**操作。

  

## 优化

1.尽量**减少基础状态机（要被继承的AnimatorController）的复杂程度**，尽量少的在基础状态机里使用很复杂的动画，可以在里面尽量多的使用空AnimationClip（前面的dummy动画），因为反正它们是要被继承重写的。

还有例如我们基础状态机中有上百个State，然后每次只Override两三个，那你就亏成傻逼了。我们可以拆成多个Controller或者拆成多个State来控制，甚至尝试拆成多个Animator。

2.尽可能**增加AnimationClip中Constant曲线的占比**，例如在导入选项中进行动画压缩，如下图：

![](https://pic3.zhimg.com/80/v2-923158c77dbdca71eaef06fd3a5282a2_720w.webp)

当动画幅度很小时，也可以削减动画的精度，即减小Error相关的值，这样可以压缩掉更多的本来就很相近的关键帧。

![](https://pic4.zhimg.com/80/v2-f9f2e601ee533fcbbac2ea41e7f095c3_720w.webp)

上诉这些操作这样可以减少曲线数量，增加Constant曲线的占比，同时还会减少内存的占用。

3.使用**Timeline**系统。Animator设计上把整个Controller看做是一个整体，在运行时所有的操作，例如任何一次Override，任何一次修改，都是对整体数据集的修改，非常的庞大。Unity在做Timeline的时候避免了这个问题，它是基于每个Clip去修改的，因此Timeline整体的性能消耗会更平缓一些，是更加灵活更加好的选择。

4.花钱消灾，官方定制方案。利用到了JobSystem多线程等。

