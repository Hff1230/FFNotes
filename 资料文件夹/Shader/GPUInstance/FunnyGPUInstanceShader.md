```
Shader "Unlit/FunnyGPUInstance"

{

    Properties

    {

        _MainTex ("Texture", 2D) = "white" {}

    }

    SubShader

    {

        Tags { "RenderType"="Opaque" }

        LOD 100

  

        //ZWrite Off

        Pass

        {

            CGPROGRAM

            //第一步： sharder 增加变体使用shader可以支持instance

            #pragma multi_compile_instancing

  

            #pragma vertex vert

            #pragma fragment frag

            // make fog work

            #pragma multi_compile_fog

  

            include "UnityCG.cginc"

  

            UNITY_INSTANCING_BUFFER_START(Props)

                UNITY_DEFINE_INSTANCED_PROP(float4,_Color)

                UNITY_DEFINE_INSTANCED_PROP(float, _Phi)

            UNITY_INSTANCING_BUFFER_END(Props)

  

            struct appdata

            {

                float4 vertex : POSITION;

                float2 uv : TEXCOORD0;

  

                //第二步：instancID 加入顶点着色器输入结构

                UNITY_VERTEX_INPUT_INSTANCE_ID

            };

  

            struct v2f

            {

                float2 uv : TEXCOORD0;

                UNITY_FOG_COORDS(1)

                float4 vertex : SV_POSITION;

                //第三步：instancID加入顶点着色器输出结构

                UNITY_VERTEX_INPUT_INSTANCE_ID

            };

  

            sampler2D _MainTex;

            float4 _MainTex_ST;

  

            v2f vert (appdata v)

            {

                v2f o;

                //第四步：instanceid在顶点的相关设置  

                UNITY_SETUP_INSTANCE_ID(v);

                //第五步：传递 instanceid 顶点到片元

                UNITY_TRANSFER_INSTANCE_ID(v, o);

  

                float phi = UNITY_ACCESS_INSTANCED_PROP(Props, _Phi);

                v.vertex = v.vertex + sin(_Time.y + phi);

  

                o.vertex = UnityObjectToClipPos(v.vertex);

                o.uv = TRANSFORM_TEX(v.uv, _MainTex);

                UNITY_TRANSFER_FOG(o,o.vertex);

  

                return o;

            }

  

            fixed4 frag (v2f i) : SV_Target

            {

                //第六步：instanceid在片元的相关设置

                UNITY_SETUP_INSTANCE_ID(i);

  

                //得到由CPU设置的颜色

                float4 col= UNITY_ACCESS_INSTANCED_PROP(Props, _Color);

                return col;

            }

            ENDCG

        }

    }

}
```