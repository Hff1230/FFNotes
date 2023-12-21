
using System;

using System.Collections;

using System.Collections.Generic;

using System.Linq;

using FairyGUI;

using UnityEngine;

using DG.Tweening;



public class GuideView : PopupBaseView {

    public bool isMoving;

    public bool isRefreshStory;

    int m_times;

    int m_count;

    int m_clickCount;

    double m_clickDelayCntDelayTime; // 延迟的时间//

    double m_clickDelaySetTime; //设置的时间戳//

    private float fade = 0.7f;

    private float intensity = 1.0f;

  

    GObject coverComponent;

    GObject coverBg;

    GObject preventFg;

    NewPlotView m_NewPlotView;

  

    public static GuideView Instance;

    public UIPanel gpanel;

    public GComponent GetMainView() {

        return _mainView;

    }

    protected override void Awake() {

        base.Awake();

        UIObjectFactory.SetPackageItemExtension("ui://icon_mainmenu/dialoguePage", typeof(NewPlotView));

    }

  

    public static GuideView create(int order) {

        if(order > 0) {

            return PopupViewController.getInstance().CreatePopupViewWithOrder<GuideView>("GuideView", 500);

        }

        return PopupViewController.getInstance().CreatePopupView<GuideView>("GuideView");

    }

  

    public override void Init(params object[] data) {

        base.Init(data);

        m_times = 0;

        m_count = 0;

        m_clickCount = 0;

        isMoving = false;

        m_clickDelayCntDelayTime = 0;

        m_clickDelaySetTime = 0;

        isRefreshStory = false;

        preventFg = this._mainView.GetChild("n0");

        this._mainView.onTouchBegin.Add(onTouchBegan);

        Instance = this;

        gpanel = this.gameObject.GetComponent<UIPanel>();

    }

  

    public void setClickTimes(int times) {

        m_times = 0;

        m_count = times;

        m_clickCount = 0;

    }

  

    public void setClickCntDelayTime(double delayTime) {

        m_clickDelaySetTime = Global.gGameTime.getWorldTime();

        m_clickDelayCntDelayTime = delayTime;

    }

  
  

    protected override void OnEnable() {

        base.OnEnable();

        preventFg.setVisible(true);

        CCSafeNotificationCenter.sharedNotificationCenter().addObserver(this, playPlotOver, Global.PLOT_PLAY_OVER, null);

        CCSafeNotificationCenter.sharedNotificationCenter().addObserver(this, viewCreated, Global.VIEW_CREATED, null);

    }

  
  

    protected override void OnDisable() {

        base.OnDisable();

        CCDirector.sharedDirector().getScheduler().unscheduleAllForTarget(this);

        CCSafeNotificationCenter.sharedNotificationCenter().removeObserver(this, Global.PLOT_PLAY_OVER);

        CCSafeNotificationCenter.sharedNotificationCenter().removeObserver(this, Global.VIEW_CREATED);

    }

  
  

    public void doPlot(string did, bool cover, int typePlot = 1) {

        if(did == "") {

            if(SceneController.getInstance().currentSceneId == Global.SCENE_ID_FREEBUILD) {

                GuideController.getInstance().setGuide("");

            }

            return;

        }

        removeFinger();

        StartCoroutine(DelayAddNewPlot(did, typePlot));

    }

  

    IEnumerator DelayAddNewPlot(string did, int typePlot) {

        if(m_NewPlotView == null) {

            m_NewPlotView = NewPlotView.create(did, typePlot, _mainView);

            if(PopupViewController.getInstance().useStaticBlur) {

                this.needBlur = true;

                yield return 1;

            }

            this._mainView.AddChild(m_NewPlotView);

            m_NewPlotView.setPosition(Vector2.zero);

            m_NewPlotView.SetSize(this._mainView.size.x, this._mainView.size.y);

        } else {

            m_NewPlotView.init(did, _mainView, typePlot);

        }

        PopupViewController.getInstance().PanelToTop(this);

        yield return 1;

    }

  

    public GObject getGuideNode() {

        if(m_NewPlotView != null) {

            return m_NewPlotView.getGuideNode();

        }

        return null;

    }

  

    void playPlotOver(object param) {

        /*if(m_NewPlotView != null) {

            m_NewPlotView.Dispose();

            m_NewPlotView = null;

        }*/

        if(m_NewPlotView != null) {

            m_NewPlotView.Clear();

        }

        GuideController.share().next();

    }

  
  

    void viewCreated(object param)

    {

        var guide = GuideConfig.Get(GuideController.getInstance().getCurrentId());

        if (guide != null)

        {

            int order = guide.order;

            if (order == 1) {

                PopupViewController.getInstance().PanelToTop(this);

            }

        }

    }

  

    /// <summary>

    /// 以前是什么意思不知道，现在改为黑影是否存在//

    /// </summary>

    /// <param name="num"></param>

    public void setModelLayerOpacity(int num) {

        if(num == 1 && coverBg != null) {

            if(coverBg.displayObject.material != null) {

                coverBg.displayObject.material.DOFloat(fade, "_fade", 0.3f).SetEase(Ease.OutSine);

                coverBg.displayObject.material.DOFloat(intensity, "_intensity", 0.3f).SetEase(Ease.OutSine);

            }

            coverBg.setVisible(true);

        }

    }

  

    void SetGuideMaterialParam(Material mat, GObject node) {

        Shader sh = Shader.Find("Custom/Vignette");

        if(mat.shader != sh) {

            mat.shader = sh;

        }

        var screenPos = node.LocalToGlobal(Vector2.zero);

        screenPos = this._mainView.GlobalToLocal(screenPos);

        var midPos = node.getMidPositionDis();

        var xx = screenPos.x + midPos.x;

        var yy = screenPos.y + midPos.y;

  

        var _x = -(xx - this._mainView.size.x / 2) / (this._mainView.size.x / 2);

        var _y = (yy - this._mainView.size.y / 2) / (this._mainView.size.y / 2);

  

        //开启抗锯齿后，DX接口下，竖直方向坐标相反

        mat.SetInt("_openAntiAtlias", QualitySettings.antiAliasing);

        mat.SetFloat("_opacity", 1.0f);

        mat.SetFloat("_offsetX", _x);

        mat.SetFloat("_offsetY", _y);

        mat.SetFloat("_width", 0f);

        mat.SetFloat("_height", 0f);

        mat.SetFloat("_fade", 0.5f);

        mat.SetFloat("_intensity", 0.01f);

        mat.SetFloat("_ellipse", 2);

        float wi = 0.9f;

        if(node.actualWidth < 300) {

            wi = 0.6f;

        }

        float hi = 0.35f;

        if(node.actualHeight < 300) {

            hi = 0.25f;

        }

        float endWidth = (this._mainView.width / 2) / node.actualWidth * wi;

        float endHeight = (this._mainView.height / 2) / node.actualHeight * hi;

        mat.DOFloat(endWidth, "_width", 0.5f).SetEase(Ease.OutQuad);

        mat.DOFloat(endHeight, "_height", 0.5f).SetEase(Ease.OutQuad);

    }

  
  

    /// <summary>

    /// 添加引导遮罩

    /// </summary>

    /// <param name="node">可点击节点，若为空，则全屏遮罩</param>

    /// <param name="rect"></param>

    /// <param name="type"></param>

    /// <param name="showPicticle"></param>

    public void addCover(GObject node, CCRect rect, int type, bool showPicticle) {

        preventFg.setVisible(false);

        if(coverComponent != null) {

            this._mainView.RemoveChild(coverComponent, true);

            coverComponent = null;

        }

        if(coverComponent == null) {

            var fingerRoot = UIPackage.CreateObject("icon_mainmenu", "HandControl").asCom;

            this._mainView.AddChildAt(fingerRoot, 0);

            fingerRoot.setPosition(Vector2.zero);

            var graph = fingerRoot.GetChild("windows").asGraph;

            graph.setAnchorPoint(new Vector2(0, 0));

            var bg = fingerRoot.GetChild("n0").asGraph;

            bg.SetSize(this._mainView.size.x, this._mainView.size.y);

            coverBg = bg;

            bg.alpha = 50;

            if(node != null) {

                graph.setVisible(true);

                var screenPos = node.LocalToGlobal(Vector2.zero);

                screenPos = this._mainView.GlobalToLocal(screenPos);

                screenPos += node.getLeftUpPositionDis();

                graph.setPosition(screenPos);

                graph.width = node.width * node.scaleX < 50 ? 150 : node.width * node.scaleX;

                graph.height = node.height * node.scaleY < 50 ? 100 : node.height * node.scaleY;

                bg.displayObject.material = Resources.Load<Material>("guide");

                SetGuideMaterialParam(bg.displayObject.material, node);

            } else {

                graph.setVisible(false);

                fingerRoot.GetChild("n0").asGraph.alpha = 0.01f;

            }

            coverComponent = fingerRoot;

        }

    }

  

    GObject finger;

    public void addFinger(GObject m_node) {

        var guide = GuideConfig.Get(GuideController.getInstance().getCurrentId());

        Vector2 particlePos = Vector2.zero;

        finger = UIPackage.CreateObject("icon_mainmenu", "handClick").asCom;

        _mainView.AddChild(finger);

        UIComponent.getInstance().SetMapGuideFingerComponent(finger.asCom);

        var screenPos = m_node.LocalToGlobal(Vector2.zero);

        screenPos = _mainView.GlobalToLocal(screenPos);

        var midPos = m_node.getMidPositionDis();

        var xx = screenPos.x + midPos.x;

        var yy = screenPos.y + midPos.y;

        finger.setPosition(new Vector2(xx, yy));

        if (guide.fingerEffectBranch == 0 || (LocalTextController.shared().GetUIBranchStrategy() == UIBranchStrategy.Default && guide.fingerEffectBranch == 1)

                || (LocalTextController.shared().GetUIBranchStrategy() == UIBranchStrategy.RTL && guide.fingerEffectBranch == 2))

        {

            if (guide.fingerFlip != 0 || guide.fingerRotation != 0)

            {

                finger.displayObject.gameObject.transform.localRotation = Quaternion.Euler(new Vector3(guide.fingerFlip == 0 ? 0 : -180, 0, (guide.fingerFlip == 0 ? 1 : -1) * guide.fingerRotation));

            }

        }

        GObject fin = finger.asCom.GetChild("n0");

        fin.setVisible(guide.showFinger != "2");

        var m_effect = finger.asCom;

        if (guide.showFinger != "3")

        {

            for (int i = 1; i <= 2; ++i)

            {

                var particle1 = ParticleController.createUIParticle(string.Format("NewbieTouch_{0}", i.ToString()).getCString(), particlePos, 50);

                GGraph holder1 = new GGraph();

                m_effect.AddChild(holder1);

                GoWrapper we1 = new GoWrapper(particle1.gameObject);

                holder1.SetNativeObject(we1);

            }

        }

        GGraph holder = new GGraph();

        m_effect.AddChild(holder);

        GoWrapper we = new GoWrapper();

        TransitionHook fun1 = () =>

        {

            if (guide.showFinger != "3")

            {

                var particle1 = ParticleController.createUIParticle(string.Format("NewbieTouch_{0}", 0).getCString(), particlePos, 50);

                particle1.setAutoRemoveOnFinish(true);

                we.SetWrapTarget(particle1.gameObject, false);

                holder.SetNativeObject(we);

            }

        };

        finger.asCom.GetTransition("t0").SetHook("start", fun1);

        finger.asCom.GetTransition("t0").Play(-1, 0, null);

    }

  

    public void removeFinger() {

        _mainView.RemoveChild(finger);

    }

  

    public void ToTop() {

        PopupViewController.getInstance().PanelToTop(this);

  

    }

  
  

    void removeCover() {

        if(coverComponent != null) {

            this._mainView.RemoveChild(coverComponent, true);

            coverComponent = null;

        }

        if(m_NewPlotView != null) {

            m_NewPlotView.Dispose();

            m_NewPlotView = null;

        }

    }

  

    public void removeModelLayer() {

        if(coverComponent != null) {

            this._mainView.RemoveChild(coverComponent, true);

            coverComponent = null;

        }

    }

  

    void onTouchBegan(EventContext context) {

        CCSafeNotificationCenter.sharedNotificationCenter().postNotification("free_refresh_stroy_view");

        if(isMoving) {

            return;

        }

        //string curGuideId = GuideController.share().getCurrentId();

        string curGuideId = GuideController.getInstance().getCurrentId();

        var guide = GuideConfig.Get(curGuideId);

        string notAllowBreak = guide.notAllowBreak; //1表示不允许点击多次中断引导

        if(guide.hideLayer == "1" && coverBg != null) {

            setModelLayerOpacity(1);

        }

        //防止出现异常卡住//

        if(notAllowBreak != "1" && SceneController.getInstance().currentSceneId == Global.SCENE_ID_FREEBUILD) {

            if(m_clickDelayCntDelayTime + m_clickDelaySetTime <= Global.gGameTime.getWorldTime()) {

                if(m_clickCount > 500) {

                    //GuideController.getInstance().setGuide("");

                    GuideController.getInstance().setGuide("");

                    return;

                }

                m_clickCount++;

            }

        }

        //点击其他地方几次，直接进入下一次处理

        if(0 < m_count && m_clickDelayCntDelayTime + m_clickDelaySetTime <= Global.gGameTime.getWorldTime()) {

            ++m_times;

            if(m_count == m_times) {

                Action<float> fun = ((float dt) => {

                });

                if(CCCommonUtils.isFreeBuild()) {

                    Scheduler.Instance.scheduleOnce(new Scheduler.schedule_selector(fun), 0.1f, "xxx");

                } else {

                    Scheduler.Instance.scheduleOnce(new Scheduler.schedule_selector(fun), 1.0f, "xxx");

                }

            }

        }

        //lag>1024点击自动跳转到下一步//

        if(guide.lag >= 1024) {

            CCSafeNotificationCenter.sharedNotificationCenter().postNotification(Global.GUIDE_INDEX_CHANGE, "free_click_next");

        }
    } 
}
