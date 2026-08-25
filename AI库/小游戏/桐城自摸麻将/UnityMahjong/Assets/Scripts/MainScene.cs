using UnityEngine;

/// <summary>
/// 主场景 - 使用 Android 原生 WebView 加载游戏
/// </summary>
public class MainScene : MonoBehaviour
{
    void Start()
    {
        // 获取屏幕宽高
        float screenWidth = Screen.width;
        float screenHeight = Screen.height;

        // 创建 Android WebView
        using (AndroidJavaClass unityClass = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
        {
            using (AndroidJavaObject activity = unityClass.GetStatic<AndroidJavaObject>("currentActivity"))
            {
                // 创建 WebView
                using (AndroidJavaObject webView = new AndroidJavaObject("android.webkit.WebView", activity))
                {
                    // 配置 WebView
                    using (AndroidJavaObject settings = webView.Call<AndroidJavaObject>("getSettings"))
                    {
                        settings.Call("setJavaScriptEnabled", true);
                        settings.Call("setDomStorageEnabled", true);
                        settings.Call("setLoadWithOverviewMode", true);
                        settings.Call("setUseWideViewPort", true);
                        settings.Call("setSupportZoom", true);
                        settings.Call("setBuiltInZoomControls", true);
                        settings.Call("setDisplayZoomControls", false);
                    }

                    // 加载本地 HTML 文件
                    webView.Call("loadUrl", "file:///android_asset/game/index.html");

                    // 设置全屏
                    using (AndroidJavaClass windowClass = new AndroidJavaClass("android.view.WindowManager$LayoutParams"))
                    {
                        using (AndroidJavaObject layoutParams = activity.Call<AndroidJavaObject>("getWindow").Call<AndroidJavaObject>("getAttributes"))
                        {
                            layoutParams.Set("flags",
                                windowClass.GetStatic<int>("FLAG_FULLSCREEN") |
                                windowClass.GetStatic<int>("FLAG_LAYOUT_NO_LIMITS"));
                            activity.Call<AndroidJavaObject>("getWindow").Call("setAttributes", layoutParams);
                        }
                    }

                    // 创建 LinearLayout 并添加 WebView
                    using (AndroidJavaObject linearLayout = new AndroidJavaObject("android.widget.LinearLayout", activity))
                    {
                        linearLayout.Call("setOrientation", 0); // VERTICAL

                        using (AndroidJavaClass layoutParamsClass = new AndroidJavaClass("android.widget.LinearLayout$LayoutParams"))
                        {
                            using (AndroidJavaObject matchParent = new AndroidJavaObject("android.widget.LinearLayout$LayoutParams",
                                -1, -1)) // MATCH_PARENT, MATCH_PARENT
                            {
                                linearLayout.Call("addView", webView, matchParent);
                            }
                        }

                        // 设置 Activity 的 ContentView
                        activity.Call("setContentView", linearLayout);
                    }
                }
            }
        }
    }
}
