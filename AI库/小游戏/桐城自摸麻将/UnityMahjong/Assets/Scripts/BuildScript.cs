
using UnityEngine;
using UnityEditor;
using System.IO;

/// <summary>
/// 自动构建 Android APK 的脚本
/// 通过 Unity 命令行执行: -executeMethod BuildScript.BuildAndroid
/// </summary>
public class BuildScript : Editor
{
    [MenuItem("Tools/Build Android APK")]
    public static void BuildAndroid()
    {
        string buildPath = "build";
        if (!Directory.Exists(buildPath))
            Directory.CreateDirectory(buildPath);

        string apkPath = Path.Combine(buildPath, "app-debug.apk");

        // 设置 Android 构建选项
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = GetEnabledScenes(),
            locationPathName = apkPath,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        };

        Debug.Log("开始构建 Android APK...");
        BuildResult result = BuildPipeline.BuildPlayer(buildPlayerOptions);

        if (result.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("构建成功! APK 位置: " + apkPath);
        }
        else
        {
            Debug.LogError("构建失败: " + result.summary.totalErrors);
        }
    }

    static EditorScene[] GetEnabledScenes()
    {
        // 获取所有已启用的场景
        var scenes = new System.Collections.Generic.List<EditorScene>();
        for (int i = 0; i < EditorApplication.sceneCount; i++)
        {
            var scene = EditorApplication.GetSceneByIndex(i);
            if (!string.IsNullOrEmpty(scene.path))
            {
                scenes.Add(scene);
            }
        }
        return scenes.ToArray();
    }
}
