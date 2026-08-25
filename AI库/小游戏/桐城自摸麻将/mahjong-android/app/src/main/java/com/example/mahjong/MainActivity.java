package com.example.mahjong;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private EditText etIp;
    private EditText etPort;
    private Button btnConnect;
    private Button btnBack;
    private ProgressBar progressBar;
    private LinearLayout loginLayout;
    private static final String PREFS_NAME = "server_prefs";
    private static final String KEY_IP = "server_ip";
    private static final String KEY_PORT = "server_port";
    private static final int REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        etIp = findViewById(R.id.etServerIp);
        etPort = findViewById(R.id.etServerPort);
        btnConnect = findViewById(R.id.btnConnect);
        btnBack = findViewById(R.id.btnBack);
        progressBar = findViewById(R.id.progressBar);
        loginLayout = findViewById(R.id.loginLayout);
        webView = findViewById(R.id.webView);

        // 加载保存的IP
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        etIp.setText(prefs.getString(KEY_IP, "192.168.1.100"));
        etPort.setText(prefs.getString(KEY_PORT, "8081"));

        // 检查权限
        checkPermissions();

        btnConnect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                connectToServer();
            }
        });

        btnBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }

    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                               Manifest.permission.ACCESS_COARSE_LOCATION},
                    REQUEST_CODE);
        }
    }

    private void connectToServer() {
        String ip = etIp.getText().toString().trim();
        String port = etPort.getText().toString().trim();

        if (ip.isEmpty()) {
            Toast.makeText(this, "请输入IP地址", Toast.LENGTH_SHORT).show();
            return;
        }

        int portNum = 8081;
        try {
            portNum = Integer.parseInt(port);
        } catch (NumberFormatException e) {
            Toast.makeText(this, "端口号无效", Toast.LENGTH_SHORT).show();
            return;
        }

        // 保存设置
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_IP, ip);
        editor.putString(KEY_PORT, String.valueOf(portNum));
        editor.apply();

        // 构建URL
        String url = "http://" + ip + ":" + portNum;

        // 配置WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(android.webkit.WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public boolean shouldOverrideUrlLoading(android.webkit.WebView view, String url) {
                return false;
            }
        });

        // 显示进度条，隐藏登录界面
        loginLayout.setVisibility(View.GONE);
        progressBar.setVisibility(View.VISIBLE);

        // 加载游戏页面
        webView.loadUrl(url);
        webView.setVisibility(View.VISIBLE);
    }
}
