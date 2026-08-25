package com.example.mahjong;

import android.content.Context;
import android.util.Log;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWebSockets;
import fi.iki.elonen.NanoWSD;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MahjongServer extends NanoWSD {
    private static final int PORT = 8081;
    private static final String TAG = "MahjongServer";

    private final Context context;
    private String htmlContent = null;
    private ConcurrentHashMap<String, byte[]> imageCache = new ConcurrentHashMap<>();

    // 游戏状态
    private ConcurrentHashMap<String, GameTable> tables = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, String> playerToTable = new ConcurrentHashMap<>();
    private int tableCounter = 0;
    private String localIP;

    // WebSocket 客户端连接
    private ConcurrentHashMap<String, WebSocketSession> clients = new ConcurrentHashMap<>();

    public MahjongServer(Context context) throws IOException {
        super(PORT);
        this.context = context;
        loadAssets();
        this.localIP = getLocalIPAddress();
    }

    private void loadAssets() {
        try {
            // 加载 HTML 文件
            htmlContent = readAsset("majiang-lan.html");
            Log.i(TAG, "HTML 文件加载成功，大小: " + htmlContent.length() + " 字符");

            // 加载图片
            String[] imageFiles = context.getAssets().list("Images");
            if (imageFiles != null) {
                for (String file : imageFiles) {
                    try (InputStream is = context.getAssets().open("Images/" + file)) {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = is.read(buffer)) > 0) {
                            baos.write(buffer, 0, len);
                        }
                        imageCache.put("Images/" + file, baos.toByteArray());
                    }
                }
                Log.i(TAG, "加载了 " + imageCache.size() + " 个图片资源");
            }
        } catch (IOException e) {
            Log.e(TAG, "加载资源失败", e);
        }
    }

    private String readAsset(String fileName) throws IOException {
        try (InputStream is = context.getAssets().open(fileName);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    private byte[] getImageAsset(String fileName) {
        return imageCache.get(fileName);
    }

    private String getLocalIPAddress() {
        try {
            InetAddress addr = InetAddress.getLoopbackAddress();
            // 尝试获取真实局域网IP
            java.util.Enumeration<java.net.NetworkInterface> interfaces = java.net.NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                java.net.NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                java.util.Enumeration<InetAddress> addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr2 = addrs.nextElement();
                    if (!addr2.isLoopbackAddress()) {
                        return addr2.getHostAddress();
                    }
                }
            }
            return "127.0.0.1";
        } catch (Exception e) {
            return "127.0.0.1";
        }
    }

    public String getServerURL() {
        return "http://" + localIP + ":" + PORT;
    }

    @Override
    protected void init() {
        Log.i(TAG, "服务器启动，地址: " + getServerURL());
        // 创建初始空桌
        ensureEmptyTable();
    }

    @Override
    protected void serve(NanoHTTPD.IHTTPSession session) {
        String uri = session.getUri();
        Method method = session.getMethod();

        if (method != Method.GET) {
            sendResponse(NanoHTTPD.Response.status(405), null);
            return;
        }

        // 服务主页
        if (uri.equals("/") || uri.equals("/index.html")) {
            try {
                Response resp = newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", htmlContent);
                sendResponse(resp, null);
            } catch (IOException e) {
                Log.e(TAG, "服务HTML失败", e);
            }
            return;
        }

        // 忽略 favicon
        if (uri.equals("/favicon.ico")) {
            sendEmptyResponse();
            return;
        }

        // 服务图片
        if (uri.startsWith("/Images/")) {
            String imagePath = uri.substring(1); // 去掉开头的 /
            byte[] imageData = getImageAsset(imagePath);
            if (imageData != null) {
                String contentType = getMimeType(imagePath);
                try {
                    Response resp = newFixedLengthResponse(Response.Status.OK, contentType,
                            new java.io.ByteArrayInputStream(imageData), imageData.length);
                    sendResponse(resp, null);
                } catch (IOException e) {
                    Log.e(TAG, "服务图片失败: " + imagePath, e);
                }
            } else {
                sendNotFound();
            }
            return;
        }

        // 其他请求
        sendNotFound();
    }

    private String getMimeType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js")) return "application/javascript";
        return "application/octet-stream";
    }

    private void sendEmptyResponse() {
        try {
            Response resp = newFixedResponse(Response.Status.NO_CONTENT, "text/plain", "");
            sendResponse(resp, null);
        } catch (IOException e) {
            Log.e(TAG, "发送空响应失败", e);
        }
    }

    private void sendNotFound() {
        try {
            Response resp = newFixedResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
            sendResponse(resp, null);
        } catch (IOException e) {
            Log.e(TAG, "发送404失败", e);
        }
    }

    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        Log.d(TAG, "WebSocket 连接建立");
        return new MahjongWebSocket(handshake);
    }

    // ==================== 游戏逻辑 ====================

    private void ensureEmptyTable() {
        boolean hasEmpty = false;
        for (GameTable table : tables.values()) {
            if (!table.started && table.players.size() < 4) {
                hasEmpty = true;
                break;
            }
        }
        if (!hasEmpty && tables.isEmpty()) {
            createTable();
            Log.i(TAG, "创建初始空桌");
        }
    }

    private GameTable createTable() {
        tableCounter++;
        GameTable table = new GameTable(tableCounter);
        tables.put(table.id, table);
        Log.i(TAG, "创建牌桌: " + table.id);
        return table;
    }

    // ==================== WebSocket 处理类 ====================

    private class MahjongWebSocket extends NanoWebSockets.NanoWSDWebSocket {
        private String playerId = null;
        private String playerName = null;
        private String currentTableId = null;

        public MahjongWebSocket(IHTTPSession handshakeRequest) {
            super(handshakeRequest);
        }

        @Override
        public void onOpen() {
            Log.d(TAG, "WebSocket 打开");
            // 注册客户端连接，使广播能发送到该客户端
            clients.put(getSessionId(), this);
            Log.d(TAG, "已注册客户端，当前连接数: " + clients.size());
        }

        @Override
        public void onMessage(ByteBuffer message) {
            try {
                String msgText = message.toString(StandardCharsets.UTF_8);
                Log.d(TAG, "收到消息: " + msgText);

                JSONObject msg = new JSONObject(msgText);
                String type = msg.optString("type");

                switch (type) {
                    case "login":
                        handleLogin(msg);
                        break;
                    case "getTableList":
                        handleGetTableList();
                        break;
                    case "createTable":
                        handleCreateTable();
                        break;
                    case "joinTable":
                        handleJoinTable(msg);
                        break;
                    // 其他消息类型可以后续添加
                    default:
                        Log.d(TAG, "未处理的消息类型: " + type);
                }
            } catch (Exception e) {
                Log.e(TAG, "处理消息失败", e);
            }
        }

        private void handleLogin(JSONObject msg) throws Exception {
            playerName = msg.optString("name", "玩家");
            playerId = "player_" + System.currentTimeMillis() + "_" + Integer.toHexString((int)(Math.random() * 0x100000000));

            Log.i(TAG, "玩家登录: " + playerName + " (ID: " + playerId + ")");

            JSONObject resp = new JSONObject();
            resp.put("type", "loginSuccess");
            resp.put("playerId", playerId);
            resp.put("playerName", playerName);

            sendText(resp.toString());

            // 发送牌桌列表
            handleGetTableList();
        }

        private void handleGetTableList() {
            try {
                JSONArray tablesArray = new JSONArray();
                for (GameTable table : tables.values()) {
                    JSONObject tableObj = table.getTableInfo();
                    tablesArray.put(tableObj);
                }

                JSONObject resp = new JSONObject();
                resp.put("type", "tableList");
                resp.put("tables", tablesArray);

                sendText(resp.toString());
                Log.i(TAG, "发送牌桌列表: " + tablesArray.length() + " 张桌");
            } catch (Exception e) {
                Log.e(TAG, "发送牌桌列表失败", e);
            }
        }

        private void handleCreateTable() {
            try {
                GameTable newTable = createTable();
                Log.i(TAG, "创建新桌: " + newTable.id);

                // 发送 tableList 广播
                handleGetTableList();

                // 通知所有客户端
                broadcastTableList();
            } catch (Exception e) {
                Log.e(TAG, "创建牌桌失败", e);
            }
        }

        private void handleJoinTable(JSONObject msg) {
            try {
                String tableId = msg.optString("tableId");
                int seatNum = msg.optInt("seatNum", 1);

                GameTable table = tables.get(tableId);
                if (table == null) {
                    sendError("牌桌不存在");
                    return;
                }

                if (!table.addPlayer(playerId, playerName, seatNum, this)) {
                    sendError("无法加入牌桌（已满或游戏已开始）");
                    return;
                }

                currentTableId = tableId;
                playerToTable.put(playerId, tableId);

                // 广播更新
                broadcastTableList();
                table.broadcastPlayerList();
                Log.i(TAG, playerName + " 加入牌桌 " + tableId);
            } catch (Exception e) {
                Log.e(TAG, "加入牌桌失败", e);
            }
        }

        private void sendError(String message) {
            try {
                JSONObject resp = new JSONObject();
                resp.put("type", "error");
                resp.put("message", message);
                sendText(resp.toString());
            } catch (Exception e) {
                Log.e(TAG, "发送错误失败", e);
            }
        }

        private void broadcastTableList() {
            try {
                JSONArray tablesArray = new JSONArray();
                for (GameTable table : tables.values()) {
                    JSONObject tableObj = table.getTableInfo();
                    tablesArray.put(tableObj);
                }

                JSONObject message = new JSONObject();
                message.put("type", "tableList");
                message.put("tables", tablesArray);

                for (MahjongWebSocket client : clients.values()) {
                    client.sendText(message.toString());
                }
                Log.i(TAG, "广播牌桌列表给 " + clients.size() + " 个客户端");
            } catch (Exception e) {
                Log.e(TAG, "广播牌桌列表失败", e);
            }
        }

        @Override
        public void onClose() {
            Log.d(TAG, "WebSocket 关闭");
            if (playerId != null) {
                String tableId = playerToTable.get(playerId);
                if (tableId != null) {
                    GameTable table = tables.get(tableId);
                    if (table != null) {
                        table.removePlayer(playerId);
                        broadcastTableList();
                    }
                }
                playerToTable.remove(playerId);
            }
            clients.remove(getSessionId());
        }

        @Override
        public void onError(Exception e) {
            Log.e(TAG, "WebSocket 错误", e);
        }
    }

    // ==================== GameTable 类 ====================

    private class GameTable {
        String id;
        int tableNumber;
        ConcurrentHashMap<String, Player> players = new ConcurrentHashMap<>();
        boolean started = false;

        public GameTable(int tableNumber) {
            this.tableNumber = tableNumber;
            this.id = "table_" + tableCounter;
        }

        public boolean addPlayer(String playerId, String playerName, int seatNum, MahjongWebSocket ws) {
            if (players.size() >= 4 || started) {
                return false;
            }

            Player player = new Player(playerId, playerName, seatNum, ws);
            players.put(playerId, player);
            return true;
        }

        public void removePlayer(String playerId) {
            players.remove(playerId);
            if (players.isEmpty()) {
                tables.remove(id);
            }
        }

        public JSONObject getTableInfo() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("tableNumber", tableNumber);
                obj.put("playerCount", players.size());
                obj.put("maxPlayers", 4);
                obj.put("started", started);
                obj.put("deckCount", 0);

                JSONArray playersArray = new JSONArray();
                for (Player player : players.values()) {
                    JSONObject pObj = player.getPlayerInfo();
                    playersArray.put(pObj);
                }
                obj.put("players", playersArray);

                return obj;
            } catch (Exception e) {
                Log.e(TAG, "获取牌桌信息失败", e);
                return new JSONObject();
            }
        }

        public void broadcastPlayerList() {
            try {
                JSONArray playersArray = new JSONArray();
                for (Player player : players.values()) {
                    playersArray.put(player.getPlayerInfo());
                }

                JSONObject msg = new JSONObject();
                msg.put("type", "playerList");
                msg.put("players", playersArray);
                msg.put("tableNumber", tableNumber);
                msg.put("started", started);
                msg.put("roundPhase", "waiting");

                for (Player player : players.values()) {
                    if (player.ws != null) {
                        player.ws.sendText(msg.toString());
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "广播玩家列表失败", e);
            }
        }
    }

    // ==================== Player 类 ====================

    private class Player {
        String id;
        String name;
        int seatNum;
        boolean ready = false;
        MahjongWebSocket ws;

        public Player(String id, String name, int seatNum, MahjongWebSocket ws) {
            this.id = id;
            this.name = name;
            this.seatNum = seatNum;
            this.ws = ws;
        }

        public JSONObject getPlayerInfo() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("name", name);
                obj.put("seatNum", seatNum);
                obj.put("ready", ready);
                obj.put("isAI", false);
                obj.put("totalScore", 0);
                return obj;
            } catch (Exception e) {
                Log.e(TAG, "获取玩家信息失败", e);
                return new JSONObject();
            }
        }
    }
}
