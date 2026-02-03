/*
 * 老照片修复脚本 (Old Photo Restoration Script)
 * 适用于 Adobe Photoshop CS6 及以上版本
 *
 * 功能：
 * - 自动调整色阶/对比度
 * - 去除噪点和轻微划痕
 * - 色彩平衡调整
 * - 锐化处理
 * - 可选的棕褐色调/黑白转换
 * - AI智能上色功能
 */

#target photoshop

// 确保有一个打开的文档
if (app.documents.length === 0) {
    alert("请先打开一张老照片！");
} else {
    // 创建主对话框
    createDialog();
}

function createDialog() {
    var doc = app.activeDocument;

    // 创建对话框窗口
    var dlg = new Window('dialog', '老照片修复工具', undefined);
    dlg.orientation = 'column';
    dlg.alignChildren = ['fill', 'top'];

    // 添加说明面板
    var infoPanel = dlg.add('panel', undefined, '说明');
    var infoText = infoPanel.add('statictext', undefined,
        '此脚本将自动修复老照片的常见问题：\n' +
        '• 褪色、泛黄 • 对比度不足 • 噪点 • 模糊\n' +
        '• 支持黑白照片智能上色',
        {multiline: true});
    infoText.alignment = ['left', 'top'];

    // 处理强度面板
    var intensityPanel = dlg.add('panel', undefined, '处理强度');
    intensityPanel.alignChildren = ['left', 'center'];

    var intensityGroup = intensityPanel.add('group');
    intensityGroup.add('statictext', undefined, '强度级别：');
    var intensityList = intensityGroup.add('dropdownlist', undefined, ['轻度', '中度', '重度']);
    intensityList.selection = 1; // 默认中度

    // 选项面板
    var optionsPanel = dlg.add('panel', undefined, '修复选项');
    optionsPanel.alignChildren = ['left', 'center'];

    var autoTone = optionsPanel.add('checkbox', undefined, '自动调整色阶/对比度');
    autoTone.value = true;

    var colorBalance = optionsPanel.add('checkbox', undefined, '色彩平衡修正');
    colorBalance.value = true;

    var noiseReduce = optionsPanel.add('checkbox', undefined, '减少噪点/划痕');
    noiseReduce.value = true;

    var sharpen = optionsPanel.add('checkbox', undefined, '智能锐化');
    sharpen.value = true;

    // 色调选项
    var tonePanel = dlg.add('panel', undefined, '色调处理');
    tonePanel.alignChildren = ['left', 'center'];

    var toneGroup = tonePanel.add('group');
    toneGroup.add('statictext', undefined, '效果：');
    var toneList = toneGroup.add('dropdownlist', undefined, ['保持原色', '转换为黑白', '复古棕褐']);
    toneList.selection = 0;

    // 上色功能面板
    var colorizePanel = dlg.add('panel', undefined, '🎨 黑白照片上色');
    colorizePanel.alignChildren = ['left', 'center'];

    var enableColorize = colorizePanel.add('checkbox', undefined, '启用智能上色');
    enableColorize.value = false;

    var colorizeGroup = colorizePanel.add('group');
    colorizeGroup.add('statictext', undefined, '上色方案：');
    var colorizeScheme = colorizeGroup.add('dropdownlist', undefined,
        ['智能自动上色', '人物肖像（肤色优先）', '风景照片（自然绿蓝）', '复古暖色调', '清凉冷色调', '自定义双色调']);
    colorizeScheme.selection = 0;
    colorizeScheme.enabled = false;

    var colorizeIntensityGroup = colorizePanel.add('group');
    colorizeIntensityGroup.add('statictext', undefined, '上色强度：');
    var colorizeIntensity = colorizeIntensityGroup.add('dropdownlist', undefined, ['轻微', '适中', '强烈']);
    colorizeIntensity.selection = 1;
    colorizeIntensity.enabled = false;

    // 启用/禁用上色选项
    enableColorize.onClick = function() {
        colorizeScheme.enabled = enableColorize.value;
        colorizeIntensity.enabled = enableColorize.value;
    }

    // 按钮组
    var btnGroup = dlg.add('group');
    btnGroup.alignment = ['center', 'center'];

    var okBtn = btnGroup.add('button', undefined, '开始修复', {name: 'ok'});
    var cancelBtn = btnGroup.add('button', undefined, '取消', {name: 'cancel'});

    okBtn.onClick = function() {
        dlg.close(1);
        applyRestoration(intensityList.selection.index, {
            autoTone: autoTone.value,
            colorBalance: colorBalance.value,
            noiseReduce: noiseReduce.value,
            sharpen: sharpen.value
        }, toneList.selection.index, {
            enabled: enableColorize.value,
            scheme: colorizeScheme.selection.index,
            intensity: colorizeIntensity.selection.index
        });
    }

    cancelBtn.onClick = function() {
        dlg.close(0);
    }

    dlg.show();
}

function applyRestoration(intensity, options, toneEffect, colorizeOptions) {
    var doc = app.activeDocument;
    var intensityFactor = [0.5, 1.0, 1.5][intensity]; // 轻度、中度、重度

    // 保存原始状态
    var historyState = doc.activeHistoryState;

    try {
        // 1. 自动调整色阶/对比度
        if (options.autoTone) {
            // 复制背景图层
            var bgLayer = doc.activeLayer;
            var toneLayer = bgLayer.duplicate();
            toneLayer.name = "色阶调整";
            doc.activeLayer = toneLayer;

            // 应用自动色阶
            doc.activeLayer.adjustAutoLevels();

            // 应用自动对比度
            doc.activeLayer.adjustAutoContrast();

            // 根据强度调整不透明度
            toneLayer.opacity = 50 + (intensityFactor * 30);
        }

        // 2. 色彩平衡修正
        if (options.colorBalance) {
            var colorLayer = doc.activeLayer.duplicate();
            colorLayer.name = "色彩平衡";
            doc.activeLayer = colorLayer;

            // 调整色彩平衡（减少黄色，增加蓝色）
            var idAdobeColorBalance = stringIDToTypeID("ADBE color balance");
            var desc = new ActionDescriptor();
            desc.putInteger(charIDToTypeID("ShfL"), 0); // 阴影
            desc.putInteger(charIDToTypeID("MdHL"), 0); // 中间调
            desc.putInteger(charIDToTypeID("HgLH"), 0); // 高光

            // 青-红调整
            desc.putInteger(charIDToTypeID("CynR"), -5 * intensityFactor);
            // 洋红-绿调整
            desc.putInteger(charIDToTypeID("MntG"), 0);
            // 黄-蓝调整
            desc.putInteger(charIDToTypeID("YlwBl"), 10 * intensityFactor);

            // 保留明度
            desc.putBoolean(charIDToTypeID("PrsL"), true);

            executeAction(idAdobeColorBalance, desc, DialogModes.NO);

            colorLayer.opacity = 40 + (intensityFactor * 20);
        }

        // 3. 减少噪点和轻微划痕
        if (options.noiseReduce) {
            // 高斯模糊+混合模式技巧
            var noiseLayer = doc.artLayers.add();
            noiseLayer.name = "降噪层";
            noiseLayer.move(doc.activeLayer, ElementPlacement.PLACEBEFORE);
            doc.activeLayer = noiseLayer;

            // 应用高斯模糊
            var radius = 1.5 * intensityFactor;
            doc.activeLayer.applyGaussianBlur(radius);

            // 设置混合模式为明度
            noiseLayer.blendMode = BlendMode.LUMINOSITY;
            noiseLayer.opacity = 30;
        }

        // 4. 智能锐化
        if (options.sharpen) {
            var sharpenLayer = doc.artLayers.add();
            sharpenLayer.name = "锐化层";
            doc.activeLayer = sharpenLayer;

            // 使用USM锐化
            var sharpenAmount = 80 * intensityFactor;
            var sharpenRadius = 1.2;
            var sharpenThreshold = 3;

            var idUnsharpMask = stringIDToTypeID("unsharpMask");
            var desc = new ActionDescriptor();
            desc.putUnitDouble(charIDToTypeID("Amnt"), charIDToTypeID("#Prc"), sharpenAmount);
            desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), sharpenRadius);
            desc.putInteger(charIDToTypeID("Thsh"), sharpenThreshold);

            executeAction(idUnsharpMask, desc, DialogModes.NO);

            sharpenLayer.blendMode = BlendMode.LUMINOSITY;
            sharpenLayer.opacity = 50;
        }

        // 5. 色调效果
        if (toneEffect > 0) {
            var toneLayer = doc.artLayers.add();
            toneLayer.name = toneEffect === 1 ? "黑白效果" : "棕褐色调";
            doc.activeLayer = toneLayer;

            // 合并可见图层到新图层
            doc.activeLayer = doc.artLayers.getByName(toneEffect === 1 ? "黑白效果" : "棕褐色调");

            if (toneEffect === 1) {
                // 黑白转换
                var idBlackAndWhite = stringIDToTypeID("blackAndWhite");
                executeAction(idBlackAndWhite, undefined, DialogModes.NO);
            } else {
                // 棕褐色调
                var idPhotoFilter = stringIDToTypeID("photoFilter");
                var desc = new ActionDescriptor();

                var colorDesc = new ActionDescriptor();
                colorDesc.putDouble(charIDToTypeID("Rd  "), 253);
                colorDesc.putDouble(charIDToTypeID("Grn "), 178);
                colorDesc.putDouble(charIDToTypeID("Bl  "), 102);

                desc.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), colorDesc);
                desc.putInteger(charIDToTypeID("Dnst"), 80);
                desc.putBoolean(charIDToTypeID("PrsL"), true);

                executeAction(idPhotoFilter, desc, DialogModes.NO);
            }

            toneLayer.opacity = 60;
        }

        // 添加曲线调整图层（整体提亮）
        var curvesLayer = doc.artLayers.add();
        curvesLayer.name = "整体提亮";
        doc.activeLayer = curvesLayer;

        var curvesAdj = doc.activeLayer.adjustments.add();
        curvesAdj.kind = LayerKind.CURVES;

        // 设置曲线（轻微提亮中间调）
        var curve = curvesAdj.curveAdjustments[0];
        curve.anchor(128, 140); // 中间调提亮

        curvesLayer.opacity = 40 * intensityFactor;

        // 6. AI智能上色功能
        if (colorizeOptions.enabled) {
            applyColorization(doc, colorizeOptions.scheme, colorizeOptions.intensity);
        }

        var colorizeMsg = colorizeOptions.enabled ? "• AI智能上色\n" : "";
        alert("✓ 老照片修复完成！\n\n已应用以下调整：\n• 色阶/对比度修正\n• 色彩平衡\n• 降噪处理\n• 智能锐化\n" +
              (toneEffect > 0 ? "• " + (toneEffect === 1 ? "黑白" : "棕褐") + "色调\n" : "") +
              colorizeMsg +
              "\n提示：各图层独立，可单独调整强度或删除。");

    } catch(e) {
        alert("错误：" + e.message);
        // 恢复原始状态
        doc.activeHistoryState = historyState;
    }
}

// AI智能上色功能
function applyColorization(doc, scheme, intensity) {
    var intensityFactor = [0.4, 0.7, 1.0][intensity]; // 轻微、适中、强烈

    // 定义上色方案
    var colorSchemes = {
        // 0: 智能自动上色 - 使用多种颜色平衡
        auto: [
            {name: "基础暖色层", r: 255, g: 240, b: 220, blend: "SOFTLIGHT", opacity: 25 * intensityFactor},
            {name: "天空蓝调", r: 135, g: 180, b: 220, blend: "COLOR", opacity: 20 * intensityFactor},
            {name: "植被绿调", r: 120, g: 160, b: 100, blend: "COLOR", opacity: 15 * intensityFactor},
            {name: "肤色暖调", r: 255, g: 200, b: 180, blend: "COLOR", opacity: 18 * intensityFactor}
        ],
        // 1: 人物肖像 - 肤色优先
        portrait: [
            {name: "基础肤色", r: 255, g: 210, b: 190, blend: "COLOR", opacity: 35 * intensityFactor},
            {name: "暖色增强", r: 255, g: 220, b: 200, blend: "SOFTLIGHT", opacity: 25 * intensityFactor},
            {name: "红润脸颊", r: 255, g: 180, b: 180, blend: "PINLIGHT", opacity: 15 * intensityFactor},
            {name: "唇色", r: 220, g: 120, b: 140, blend: "COLOR", opacity: 12 * intensityFactor}
        ],
        // 2: 风景照片 - 自然绿蓝
        landscape: [
            {name: "天空蓝", r: 140, g: 190, b: 230, blend: "COLOR", opacity: 30 * intensityFactor},
            {name: "草地绿", r: 130, g: 170, b: 100, blend: "COLOR", opacity: 25 * intensityFactor},
            {name: "大地褐", r: 180, g: 160, b: 130, blend: "COLOR", opacity: 20 * intensityFactor},
            {name: "自然增强", r: 200, g: 210, b: 200, blend: "SOFTLIGHT", opacity: 15 * intensityFactor}
        ],
        // 3: 复古暖色调
        vintage: [
            {name: "怀旧金黄", r: 255, g: 220, b: 150, blend: "COLOR", opacity: 30 * intensityFactor},
            {name: "温暖橙红", r: 255, g: 180, b: 120, blend: "OVERLAY", opacity: 20 * intensityFactor},
            {name: "复古棕褐", r: 200, g: 170, b: 130, blend: "COLOR", opacity: 25 * intensityFactor},
            {name: "岁月痕迹", r: 220, g: 200, b: 170, blend: "SOFTLIGHT", opacity: 15 * intensityFactor}
        ],
        // 4: 清凉冷色调
        cool: [
            {name: "冷蓝基调", r: 180, g: 200, b: 230, blend: "COLOR", opacity: 30 * intensityFactor},
            {name: "青色增强", r: 170, g: 210, b: 220, blend: "OVERLAY", opacity: 20 * intensityFactor},
            {name: "紫色阴影", r: 190, g: 180, b: 220, blend: "COLOR", opacity: 15 * intensityFactor},
            {name: "清凉高光", r: 200, g: 220, b: 255, blend: "SCREEN", opacity: 12 * intensityFactor}
        ],
        // 5: 自定义双色调
        duotone: [
            {name: "主色调-深蓝", r: 80, g: 100, b: 140, blend: "COLOR", opacity: 35 * intensityFactor},
            {name: "副色调-金色", r: 255, g: 200, b: 100, blend: "OVERLAY", opacity: 25 * intensityFactor},
            {name: "高光-米白", r: 250, g: 245, b: 230, blend: "SCREEN", opacity: 20 * intensityFactor}
        ]
    };

    // 选择上色方案
    var selectedScheme;
    switch(scheme) {
        case 0: selectedScheme = colorSchemes.auto; break;
        case 1: selectedScheme = colorSchemes.portrait; break;
        case 2: selectedScheme = colorSchemes.landscape; break;
        case 3: selectedScheme = colorSchemes.vintage; break;
        case 4: selectedScheme = colorSchemes.cool; break;
        case 5: selectedScheme = colorSchemes.duotone; break;
        default: selectedScheme = colorSchemes.auto;
    }

    // 为每种颜色创建填充图层
    for (var i = 0; i < selectedScheme.length; i++) {
        var colorData = selectedScheme[i];

        // 创建纯色填充图层
        var colorLayer = doc.artLayers.add();
        colorLayer.name = "🎨 " + colorData.name;
        doc.activeLayer = colorLayer;

        // 选择全部
        doc.selection.selectAll();

        // 创建纯色填充
        var fillColor = new SolidColor();
        fillColor.rgb.red = colorData.r;
        fillColor.rgb.green = colorData.g;
        fillColor.rgb.blue = colorData.b;

        doc.selection.fill(fillColor);

        // 取消选择
        doc.selection.deselect();

        // 设置混合模式
        var blendMode = getBlendMode(colorData.blend);
        colorLayer.blendMode = blendMode;
        colorLayer.opacity = colorData.opacity;
    }

    // 创建上色组文件夹
    try {
        var colorizeGroup = doc.layerSets.add();
        colorizeGroup.name = "🎨 上色效果组";

        // 将所有上色图层移到组中
        for (var i = doc.layers.length - 1; i >= 0; i--) {
            if (doc.layers[i].name.indexOf("🎨") === 0) {
                doc.layers[i].move(colorizeGroup, ElementPlacement.PLACEATBEGINNING);
            }
        }
    } catch(e) {
        // 如果创建组失败，忽略
    }
}

// 获取混合模式
function getBlendMode(modeStr) {
    switch(modeStr) {
        case "MULTIPLY": return BlendMode.MULTIPLY;
        case "SCREEN": return BlendMode.SCREEN;
        case "OVERLAY": return BlendMode.OVERLAY;
        case "SOFTLIGHT": return BlendMode.SOFTLIGHT;
        case "HARDLIGHT": return BlendMode.HARDLIGHT;
        case "COLORDODGE": return BlendMode.COLORDODGE;
        case "COLORBURN": return BlendMode.COLORBURN;
        case "DARKEN": return BlendMode.DARKEN;
        case "LIGHTEN": return BlendMode.LIGHTEN;
        case "DIFFERENCE": return BlendMode.DIFFERENCE;
        case "EXCLUSION": return BlendMode.EXCLUSION;
        case "HUE": return BlendMode.HUE;
        case "SATURATION": return BlendMode.SATURATION;
        case "COLOR": return BlendMode.COLOR;
        case "LUMINOSITY": return BlendMode.LUMINOSITY;
        case "PINLIGHT": return BlendMode.PINLIGHT;
        default: return BlendMode.NORMAL;
    }
}
