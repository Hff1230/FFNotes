const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

// 保持对window对象的全局引用，避免被JavaScript垃圾回收机制自动关闭
let mainWindow;

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 750,
        minWidth: 800,
        minHeight: 600,
        title: '小学数学口算快速出题器 v1.2.7',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // 启用打印功能
            enableRemoteModule: false,
            webSecurity: true
        },
        // 窗口样式
        backgroundColor: '#667eea',
        show: false, // 先隐藏，等加载完成后显示
        autoHideMenuBar: false
    });

    // 加载应用
    mainWindow.loadFile('index.html');

    // 窗口准备好后显示（避免白屏）
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 创建应用菜单
    const menuTemplate = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打印',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.print({
                            silent: false,
                            printBackground: true
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'forceReload', label: '强制刷新' },
                { type: 'separator' },
                { role: 'resetZoom', label: '重置缩放' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全屏' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: '小学数学口算快速出题器',
                            detail: '版本: v1.2.7\n\n专为小学生设计的数学练习工具\n支持1-6年级\n口算 + 竖式 + 应用题 + 混合运算\n\n© 2026 AI库'
                        });
                    }
                },
                {
                    label: '使用说明',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '使用说明',
                            message: '如何使用本软件',
                            detail: '1. 选择年级和难度\n2. 选择题型（口算/竖式/应用题）\n3. 选择运算类型（加/减/乘/除/混合）\n4. 点击"开始练习"或"生成试卷"\n5. 支持打印功能（Ctrl+P）\n\n祝小朋友们学习进步！'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // 当窗口关闭时触发
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // 处理外部链接（如果有）
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Electron初始化完成后触发
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});
