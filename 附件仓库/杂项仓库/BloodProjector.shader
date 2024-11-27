Shader "Custom/ProjectorShader"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _ProjectionTex ("Projection Texture", 2D) = "white" {}
        _ProjectionScale ("Projection Scale", Float) = 1.0
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata_t
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 uvShadow : TEXCOORD1;
                float4 uvFalloff: TEXCOORD2;
                float4 pos : SV_POSITION;
            };

            sampler2D _MainTex;
            sampler2D _ProjectionTex;
            float _ProjectionScale;
            fixed4 _Color;
            float4x4 unity_Projector;
            float4x4 unity_ProjectorClip;

            v2f vert (appdata_t v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uvShadow = mul(unity_Projector, v.vertex);
                o.uvFalloff = mul(unity_ProjectorClip, v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 FallOffTexColor = tex2D(_MainTex, i.uvFalloff);
                fixed4 projectionColor = tex2D(_ProjectionTex, i.uvShadow);
                projectionColor.a *= FallOffTexColor;
                return   projectionColor * _Color;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}