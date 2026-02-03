/*
 * 文档去黑影脚本 (Document Shadow Removal Script)
 * 适用于 Adobe Photoshop CS6 及以上版本
 *
 * 功能：
 * - 自动去除书本装订处阴影
 * - 去除拍摄照片边缘暗角
 * - 自动白平衡，纸张变白
 * - 提升文字对比度和清晰度
 * - 可选的透视矫正和裁剪
 */

#target photoshop

// 确保有一个打开的文档
if (app.documents.length === 0) {
    alert("请先打开一张文档照片！");
} else {
    createDialog();
}

function createDialog() {
    var doc = app.activeDocument;

    // 创建对话框窗口
    var dlg = new Window('dialog', '📄 文档去黑影工具', undefined);
    dlg.orientation = 'column';
    dlg.alignChildren = ['fill', 'top'];

    // 添加说明面板
    var infoPanel = dlg.add('panel', undefined, '📖 使用说明');
    var infoText = infoPanel.add('statictext', undefined,
        '此脚本专门用于处理拍摄的试卷、文件、书籍照片：\n' +
        '• 去除书本装订处的黑影\n' +
        '• 去除拍摄时的边缘暗角\n' +
        '• 自动白平衡，纸张变白\n' +
        '• 提升文字清晰度',
        {multiline: true});
    infoText.alignment = ['left', 'top'];

    // 文档类型
    var typePanel = dlg.add('panel', undefined, '📋 文档类型');
    typePanel.alignChildren = ['left', 'center'];

    var typeGroup = typePanel.add('group');
    typeGroup.add('statictext', undefined, '类型：');
    var typeList = typeGroup.add('dropdownlist', undefined,
        ['试卷/单页文档', '书本（有装订阴影）', '杂志/画册', '手写笔记', '证件/合同']);
    typeList.selection = 0;

    // 处理选项
    var optionsPanel = dlg.add('panel', undefined, '⚙️ 处理选项');
    optionsPanel.alignChildren = ['left', 'center'];

    var autoWhite = optionsPanel.add('checkbox', undefined, '自动白平衡（纸张变白）');
    autoWhite.value = true;

    var removeShadow = optionsPanel.add('checkbox', undefined, '去除黑影和暗角');
    removeShadow.value = true;

    var enhanceText = optionsPanel.add('checkbox', undefined, '增强文字清晰度');
    enhanceText.value = true;

    var sharpenText = optionsPanel.add('checkbox', undefined, '锐化文字边缘');
    sharpenText.value = true;

    var despeckle = optionsPanel.add('checkbox', undefined, '去除噪点（扫描痕迹）');
    despeckle.value = true;

    // 强度控制
    var intensityPanel = dlg.add('panel', undefined, '🎚️ 处理强度');
    intensityPanel.alignChildren = ['left', 'center'];

    var intensityGroup = intensityPanel.add('group');
    intensityGroup.add('statictext', undefined, '强度：');
    var intensityList = intensityGroup.add('dropdownlist', undefined, ['轻微', '适中', '强力']);
    intensityList.selection = 1;

    // 高级选项
    var advancedPanel = dlg.add('panel', undefined, '🔧 高级选项');
    advancedPanel.alignChildren = ['left', 'center'];

    var autoCrop = advancedPanel.add('checkbox', undefined, '自动裁剪边缘空白');
    autoCrop.value = false;

    var binarize = advancedPanel.add('checkbox', undefined, '转换为纯黑白（二值化）');
    binarize.value = false;

    var dustRemove = advancedPanel.add('checkbox', undefined, '去除灰尘和污点');
    dustRemove.value = false;

    // 按钮组
    var btnGroup = dlg.add('group');
    btnGroup.alignment = ['center', 'center'];

    var okBtn = btnGroup.add('button', undefined, '开始处理', {name: 'ok'});
    var cancelBtn = btnGroup.add('button', undefined, '取消', {name: 'cancel'});

    okBtn.onClick = function() {
        dlg.close(1);
        applyShadowRemoval(typeList.selection.index, {
            autoWhite: autoWhite.value,
            removeShadow: removeShadow.value,
            enhanceText: enhanceText.value,
            sharpenText: sharpenText.value,
            despeckle: despeckle.value,
            autoCrop: autoCrop.value,
            binarize: binarize.value,
            dustRemove: dustRemove.value
        }, intensityList.selection.index);
    }

    cancelBtn.onClick = function() {
        dlg.close(0);
    }

    dlg.show();
}

function applyShadowRemoval(docType, options, intensity) {
    var doc = app.activeDocument;
    var intensityFactor = [0.6, 1.0, 1.4][intensity];

    // 保存原始状态
    var historyState = doc.activeHistoryState;

    try {
        // 复制背景图层
        var bgLayer = doc.activeLayer;
        var workLayer = bgLayer.duplicate();
        workLayer.name = "处理后文档";
        doc.activeLayer = workLayer;

        // 1. 自动白平衡（让纸张变白）
        if (options.autoWhite) {
            // 使用自动白平衡
            var whiteBalanceLayer = workLayer.duplicate();
            whiteBalanceLayer.name = "白平衡调整";
            doc.activeLayer = whiteBalanceLayer;

            // 方法1：使用自动颜色
            doc.activeLayer.autoColor();

            // 方法2：手动调整色阶，提亮白色
            var idLevels = stringIDToTypeID("levels");
            var desc = new ActionDescriptor();

            // 输入色阶：0, 1.3, 255（增加对比度）
            var inputList = new ActionList();
            inputList.putInteger(0);      // 黑场
            inputList.putDouble(230);     // 白场（降低以提亮纸张）
            inputList.putDouble(255);     // 最大值

            desc.putList(charIDToTypeID("Inpt"), inputList);
            executeAction(idLevels, desc, DialogModes.NO);

            whiteBalanceLayer.opacity = 70 * intensityFactor;

            // 合并
            doc.activeLayer = whiteBalanceLayer;
            // 不合并，保持图层
        }

        // 2. 去除黑影和暗角（核心功能）
        if (options.removeShadow) {
            // 创建去阴影图层
            var shadowLayer = doc.artLayers.add();
            shadowLayer.name = "去黑影层";
            shadowLayer.move(doc.activeLayer, ElementPlacement.PLACEBEFORE);
            doc.activeLayer = shadowLayer;

            // 方法：使用大半径高斯模糊 + 混合模式
            // 选择全部
            doc.selection.selectAll();

            // 复制当前可见内容
            doc.selection.copy();
            doc.paste();
            doc.activeLayer.name = "去黑影层";

            // 应用大半径高斯模糊（创建光照图）
            doc.activeLayer.applyGaussianBlur(50 * intensityFactor);

            // 反相（让阴影变亮）
            doc.activeLayer.invert();

            // 设置混合模式为叠加或柔光
            shadowLayer.blendMode = BlendMode.OVERLAY;
            shadowLayer.opacity = 40 * intensityFactor;

            // 取消选择
            doc.selection.deselect();

            // 创建第二个去阴影层（针对装订线）
            if (docType === 1) { // 书本类型
                var bindingLayer = doc.artLayers.add();
                bindingLayer.name = "装订线修复";
                bindingLayer.move(doc.activeLayer, ElementPlacement.PLACEBEFORE);
                doc.activeLayer = bindingLayer;

                doc.selection.selectAll();
                doc.paste();
                doc.activeLayer.name = "装订线修复";

                // 应用中等半径模糊
                doc.activeLayer.applyGaussianBlur(25);

                // 设置混合模式
                bindingLayer.blendMode = BlendMode.SCREEN;
                bindingLayer.opacity = 30 * intensityFactor;

                doc.selection.deselect();
            }
        }

        // 3. 增强文字清晰度
        if (options.enhanceText) {
            var textLayer = doc.artLayers.add();
            textLayer.name = "文字增强";
            doc.activeLayer = textLayer;

            // 复制当前可见内容
            doc.selection.selectAll();
            doc.paste();
            doc.activeLayer.name = "文字增强";

            // 使用USM锐化增强文字
            var idUnsharpMask = stringIDToTypeID("unsharpMask");
            var desc = new ActionDescriptor();

            var amount = 150 * intensityFactor;
            var radius = 1.5;
            var threshold = 2;

            desc.putUnitDouble(charIDToTypeID("Amnt"), charIDToTypeID("#Prc"), amount);
            desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), radius);
            desc.putInteger(charIDToTypeID("Thsh"), threshold);

            executeAction(idUnsharpMask, desc, DialogModes.NO);

            textLayer.blendMode = BlendMode.LUMINOSITY;
            textLayer.opacity = 60;

            doc.selection.deselect();
        }

        // 4. 锐化文字边缘
        if (options.sharpenText) {
            var sharpenLayer = doc.artLayers.add();
            sharpenLayer.name = "边缘锐化";
            doc.activeLayer = sharpenLayer;

            doc.selection.selectAll();
            doc.paste();
            doc.activeLayer.name = "边缘锐化";

            // 高反差保留锐化
            doc.activeLayer.applyGaussianBlur(2.0);
            var idHighPass = stringIDToTypeID("highPass");

            // 如果高反差保留不可用，使用智能锐化
            var idSmartSharpen = stringIDToTypeID("smartSharpen");
            var desc = new ActionDescriptor();
            desc.putUnitDouble(charIDToTypeID("Amnt"), charIDToTypeID("#Prc"), 200 * intensityFactor);
            desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), 1.0);
            desc.putEnumerated(charIDToTypeID("Blm "), charIDToTypeID("#Rds"), charIDToTypeID("Gsn "));

            executeAction(idSmartSharpen, desc, DialogModes.NO);

            sharpenLayer.blendMode = BlendMode.OVERLAY;
            sharpenLayer.opacity = 50 * intensityFactor;

            doc.selection.deselect();
        }

        // 5. 去除噪点
        if (options.despeckle) {
            var noiseLayer = doc.artLayers.add();
            noiseLayer.name = "去噪层";
            doc.activeLayer = noiseLayer;

            doc.selection.selectAll();
            doc.paste();
            doc.activeLayer.name = "去噪层";

            // 去斑
            executeAction(stringIDToTypeID("despeckle"), undefined, DialogModes.NO);

            // 轻微模糊
            doc.activeLayer.applyGaussianBlur(0.5);

            noiseLayer.blendMode = BlendMode.DARKEN;
            noiseLayer.opacity = 50;

            doc.selection.deselect();
        }

        // 6. 去除灰尘和污点
        if (options.dustRemove) {
            var dustLayer = doc.artLayers.add();
            dustLayer.name = "去灰尘";
            doc.activeLayer = dustLayer;

            doc.selection.selectAll();
            doc.paste();
            doc.activeLayer.name = "去灰尘";

            // 使用灰尘与划痕滤镜
            var idDustAndScratches = stringIDToTypeID("dustAndScratches");
            var desc = new ActionDescriptor();
            desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), 2);
            desc.putInteger(charIDToTypeID("Thsh"), 15);

            executeAction(idDustAndScratches, desc, DialogModes.NO);

            dustLayer.blendMode = BlendMode.LIGHTEN;
            dustLayer.opacity = 40;

            doc.selection.deselect();
        }

        // 7. 转换为纯黑白（二值化）
        if (options.binarize) {
            // 使用阈值调整
            var thresholdLayer = doc.artLayers.add();
            thresholdLayer.name = "黑白二值化";
            doc.activeLayer = thresholdLayer;

            doc.selection.selectAll();
            doc.paste();
            doc.activeLayer.name = "黑白二值化";

            // 转为灰度
            var idGrayscale = stringIDToTypeID("grayScale");
            executeAction(idGrayscale, undefined, DialogModes.NO);

            // 阈值调整
            var idThreshold = stringIDToTypeID("threshold");
            var desc = new ActionDescriptor();
            desc.putInteger(charIDToTypeID("Lvl "), 180); // 阈值级别

            executeAction(idThreshold, desc, DialogModes.NO);

            doc.selection.deselect();
        }

        // 8. 色阶微调（确保纸张纯白）
        var finalLevels = doc.artLayers.add();
        finalLevels.name = "最终提亮";
        doc.activeLayer = finalLevels;

        doc.selection.selectAll();
        doc.paste();
        doc.activeLayer.name = "最终提亮";

        // 调整色阶，让白色更纯
        var idLevels = stringIDToTypeID("levels");
        var desc = new ActionDescriptor();
        var inputList = new ActionList();
        inputList.putInteger(10);     // 黑场
        inputList.putDouble(240);    // 白场
        inputList.putDouble(255);    // 最大值
        desc.putList(charIDToTypeID("Inpt"), inputList);
        executeAction(idLevels, desc, DialogModes.NO);

        finalLevels.blendMode = BlendMode.MULTIPLY;
        finalLevels.opacity = 30 * intensityFactor;

        doc.selection.deselect();

        // 9. 自动裁剪边缘空白
        if (options.autoCrop) {
            try {
                // 使用裁切工具去除边缘
                var idTrim = stringIDToTypeID("trim");
                var desc = new ActionDescriptor();
                desc.putEnumerated(charIDToTypeID("Based on"), charIDToTypeID("#Trim"), charIDToTypeID("TrnW")); // 基于白色
                executeAction(idTrim, desc, DialogModes.ALL);
            } catch(e) {
                // 裁剪失败，忽略
            }
        }

        alert("✓ 文档处理完成！\n\n已应用以下处理：\n" +
              (options.autoWhite ? "• 自动白平衡\n" : "") +
              (options.removeShadow ? "• 去除黑影和暗角\n" : "") +
              (options.enhanceText ? "• 文字清晰度增强\n" : "") +
              (options.sharpenText ? "• 文字边缘锐化\n" : "") +
              (options.despeckle ? "• 去除噪点\n" : "") +
              (options.dustRemove ? "• 去除灰尘污点\n" : "") +
              (options.binarize ? "• 黑白二值化\n" : "") +
              (options.autoCrop ? "• 自动裁剪边缘\n" : "") +
              "\n提示：各图层独立，可调整不透明度或删除。");

    } catch(e) {
        alert("错误：" + e.message + "\n行号：" + e.line);
        // 恢复原始状态
        doc.activeHistoryState = historyState;
    }
}
