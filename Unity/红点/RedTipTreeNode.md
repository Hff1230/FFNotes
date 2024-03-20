```
using System;

using System.Collections.Generic;

  

namespace DayZ.RedTip

{

    public class RedTipTreeNode

    {

        public RedTipStrategy Strategy { get; private set; }

        public string Key { get; private set; }

        public List<RedTipTreeNode> Children { get; set; } = new List<RedTipTreeNode>();

        public RedTipTreeNode Parent { get; set; }

        public RedTipRecordType RecordType { get; set; }

        public bool Dirty { get; private set; }

        private int _value;

        public int Value

        {

            get { return _value; }

            set

            {

                this.Dirty = true;

                _value = value;

                if (this.Parent != null)

                {

                    this.Parent.CalculateValue();

                }

            }

        }

        public event Action<int, RedTipStrategy> ValueChange;

  

        public void CalculateValue()

        {

            int value = 0;

            foreach (var item in this.Children)

            {

                value += item.Value;

            }

            this.SetValue(value);

        }

  

        public void SetValue(int value)

        {

            if (this.Strategy == RedTipStrategy.OnlyTip)

                this.Value = value > 0 ? 1 : 0;

            else

                this.Value = value;

        }

  

        public RedTipTreeNode(string key, RedTipStrategy strategy, RedTipRecordType type)

        {

            this.Strategy = strategy;

            this.Key = key;

            this.RecordType = type;

        }

  

        public void PostNotification()

        {

            if (!this.Dirty)

                return;

            this.Dirty = false;

            ValueChange?.Invoke(this.Value, this.Strategy);

        }

    }

}
```