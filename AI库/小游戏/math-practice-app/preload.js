/**
 * 预加载脚本
 * 在渲染进程加载之前运行，可以安全地暴露Node.js/Electron API给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 通过contextBridge暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 平台信息
    platform: process.platform,

    // 应用版本
    version: process.env.npm_package_version || '1.2.7',

    // 打印功能
    print: () => {
        window.print();
    },

    // 获取应用路径
    getAppPath: () => {
        return __dirname;
    }
});

// 禁用一些可能不安全的操作
window.addEventListener('DOMContentLoaded', () => {
    // 页面加载完成后的初始化
    console.log('小学数学口算快速出题器 v1.2.7 已加载');
});
