package com.example.mahjong;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.io.IOException;

public class ServerActivity extends AppCompatActivity {
    private MahjongServer server;
    private Button btnCreateRoom;
    private Button btnJoinRoom;
    private TextView tvStatus;
    private Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_server);

        btnCreateRoom = findViewById(R.id.btnCreateRoom);
        btnJoinRoom = findViewById(R.id.btnJoinRoom);
        tvStatus = findViewById(R.id.tvStatus);

        btnCreateRoom.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startServer();
            }
        });

        btnJoinRoom.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(ServerActivity.this, MainActivity.class));
            }
        });
    }

    private void startServer() {
        try {
            server = new MahjongServer(ServerActivity.this);
            server.start();

            handler.post(new Runnable() {
                @Override
                public void run() {
                    btnCreateRoom.setEnabled(false);
                    btnCreateRoom.setText("服务器已启动");
                    tvStatus.setVisibility(View.VISIBLE);
                    tvStatus.setText("房间已创建!\n\n" + server.getServerURL());
                    Toast.makeText(ServerActivity.this, "服务器已启动，等待其他人加入...", Toast.LENGTH_LONG).show();
                }
            });
        } catch (IOException e) {
            e.printStackTrace();
            Toast.makeText(ServerActivity.this, "服务器启动失败: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (server != null) {
            server.stop();
        }
    }
}
