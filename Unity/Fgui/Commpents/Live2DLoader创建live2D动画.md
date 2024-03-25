使用前注册
UIObjectFactory.SetPackageItemExtension("ui://icon_GiftPack/Live2DCell", typeof(Live2DLoader));


```
//Fgui自动创建live2D动画
using FairyGUI;

using FairyGUI.Utils;

  

namespace DayZ

{

    public sealed class Live2DLoader : GComponent

    {

        private GGraph graph;

        private GoWrapper wrapper;

  

        public override void ConstructFromXML(XML xml)

        {

            base.ConstructFromXML(xml);

            this.graph = this.GetChild("n0").asGraph;

            this.wrapper = new GoWrapper();

            this.graph.SetNativeObject(this.wrapper);

            this.wrapper.supportStencil = true;

            this.wrapper.recyleTarget = true;

        }

  

        public override void Dispose()

        {

            if (this.wrapper.wrapTarget != null)

            {

                CCNodeCache.Instance.RecycleGameObject(this.wrapper.wrapTarget);

            }

            base.Dispose();

        }

  

        public override void Setup_BeforeAdd(ByteBuffer buffer, int beginPos)

        {

            base.Setup_BeforeAdd(buffer, beginPos);

  

            var icon = this.data as string;

            if (icon != null)

            {

                this.wrapper.wrapTarget = CCNodeCache.Instance.GetGameObject(icon);

            }

        }

    }

}
```