```
using System;

using FairyGUI;

using FairyGUI.Utils;

  

namespace DayZ

{

    public sealed class CommonRedTipComponent : GComponent

    {

        private GTextField redNum;

        private GObject redBack;

        private string lastListenKey;

        private bool clear = true;

        public override void ConstructFromXML(XML xml)

        {

            base.ConstructFromXML(xml);

            this.redNum = GetChild("title").asTextField;

            this.redBack = GetChild("n0");

        }

  

        public void OnRedTipUpdate(int number, RedTipStrategy strategy = RedTipStrategy.OnlyTip)

        {

            this.redBack.visible = number > 0;

            this.redNum.text = (strategy == RedTipStrategy.OnlyTip || number <= 0) ? string.Empty : number.ToString();

        }

  

        public void SetData(string key, bool clear = true)

        {

            this.clear = clear;

            RemoveLastListener();

            if (!string.IsNullOrEmpty(key))

            {

                lastListenKey = key;

                RedTipController.Instance.Subscribe(key, OnRedTipUpdate);

            }

            else

            {

                OnRedTipUpdate(0);

            }

        }

  

        protected override void HandleVisibleChanged()

        {

            base.HandleVisibleChanged();

            if (clear && !this.visible)

            {

                RemoveLastListener();

            }

        }

  

        private void RemoveLastListener()

        {

            if (!string.IsNullOrEmpty(lastListenKey))

            {

                RedTipController.Instance.Unsubscribe(lastListenKey, OnRedTipUpdate);

                lastListenKey = null;

            }

        }

  

    }

}
```