```
using System;

using System.Collections.Generic;

using DayZ.RedTip;

  

namespace DayZ

{

    public enum RedTipStrategy

    {

        OnlyTip,

        Number

    }

  

    public enum RedTipRecordType

    {

        Default,

        Daily,

        Login

    }

    public class RedTipController : Singleton<RedTipController>

    {

        private readonly RedTipTreeNode rootNode = new RedTipTreeNode("Root", RedTipStrategy.Number, RedTipRecordType.Default);

        private Dictionary<string, RedTipTreeNode> RedTipTreeNodes = new Dictionary<string, RedTipTreeNode>();

        private HashSet<string> LoginRecordKeys = new HashSet<string>();

  

        public void Clear()

        {

            LoginRecordKeys.Clear();

        }

  

#if ROE_DEV

        public string DebugInfo()

        {

            var builder = new System.Text.StringBuilder();

  

            foreach (var item in RedTipTreeNodes.Values)

            {

                if (item.Value > 0)

                    builder.AppendFormat("{0} {1}\n", item.Key, item.Value);

            }

  

            return builder.ToString();

        }

#endif

  

        public void Subscribe(string key, Action<int, RedTipStrategy> callback)

        {

            RedTipTreeNode node;

            if (this.RedTipTreeNodes.TryGetValue(key, out node))

            {

                node.ValueChange += callback;

                callback(node.Value, node.Strategy);

            }

            else

            {

                callback(0, RedTipStrategy.OnlyTip);

            }

        }

  

        public void Unsubscribe(string key, Action<int, RedTipStrategy> callback)

        {

            RedTipTreeNode node;

            if (this.RedTipTreeNodes.TryGetValue(key, out node))

            {

                node.ValueChange -= callback;

            }

        }

  

        public void ParseData(CCDictionary dict)

        {

            if (dict == null)

                return;

  

            foreach (var item in dict)

            {

                this.ParseData(item.Key, (int)item.Value);

            }

        }

  

        public void ClearData(string key)

        {

            if(RedTipTreeNodes.TryGetValue(key, out var parent))

            {

                if (parent.Children != null && parent.Children.Count > 0)

                {

                    foreach (var child in parent.Children)

                    {

                        ClearData(child.Key);

                    }

                }

                else

                {

                    parent.SetValue(0);

                }

            }

        }

  

        public void ParseData(string key, int value)

        {

#if UNITY_EDITOR || UNITY_IOS

            if (AccountSystemManager.Instance.LoginInfo.replaceInnerBuild)

            {

                return;

            }

#endif

            RedTipTreeNode node;

            if (RedTipTreeNodes.TryGetValue(key, out node))

            {

                if (node.RecordType == RedTipRecordType.Daily)

                {

                    node.SetValue(CheckKeyRecord(key) ? 0 : value);

                }

                else if (node.RecordType == RedTipRecordType.Login)

                {

                    node.SetValue(LoginRecordKeys.Contains(key) ? 0 : value);

                }

                else

                {

                    node.SetValue(value);

                }

            }

        }

  

        public void ReadRecord(string key)

        {

            RedTipTreeNode node;

            if (RedTipTreeNodes.TryGetValue(key, out node))

            {

                if (node.RecordType == RedTipRecordType.Daily)

                {

                    this.RecordKey(key);

                }

                else if (node.RecordType == RedTipRecordType.Login)

                {

                    this.LoginRecordKeys.Add(key);

                }

                this.ParseData(key, 0);

            }

        }

  

        private void RecordKey(string key)

        {

            CCUserDefault.getInstance().setIntegerForKey(string.Format("RedTip_{0}_{1}", key, GlobalData.shared().playerInfo.uid),

                Global.gGameTime.getElapseDays());

        }

  

        public bool CheckKeyRecord(string key)

        {

            return CCUserDefault.getInstance().getIntegerForKey(string.Format("RedTip_{0}_{1}", key, GlobalData.shared().playerInfo.uid))

                == Global.gGameTime.getElapseDays();

        }

  

        public void OnUpdate()

        {

            DFS(rootNode);

        }

  

        private void DFS(RedTipTreeNode node)

        {

            if (!node.Dirty)

                return;

            node.PostNotification();

            foreach (var child in node.Children)

            {

                DFS(child);

            }

        }

  

        protected override void Initialize()

        {

            base.Initialize();

            this.CreateRedTipTree();

        }

  

        private void CreateRedTipTree()

        {

            var values = DataAtlasManager.Instance.GetDataWithType<RedTipNodeConfig>().Values;

            foreach (RedTipNodeConfig item in values)

            {

                RedTipTreeNodes.Add(item.id, new RedTipTreeNode(item.id, CCCommonUtils.ParseEnum<RedTipStrategy>(item.type),

                    CCCommonUtils.ParseEnum<RedTipRecordType>(item.recordType)));

            }

            foreach (var item in RedTipTreeNodes)

            {

                var config = DataAtlasManager.Instance.GetDataWithTypeById<RedTipNodeConfig>(item.Key);

                if (config.children.Count > 0)

                {

                    foreach (var child in config.children)

                    {

                        BindParentChild(item.Value, RedTipTreeNodes[child]);

                    }

                }

            }

            foreach (var item in RedTipTreeNodes.Values)

            {

                if (item.Parent == null)

                {

                    BindParentChild(rootNode, item);

                }

            }

        }

  

        private void BindParentChild(RedTipTreeNode parent, RedTipTreeNode child)

        {

            if (child.Parent != null)

            {

                throw new ArgumentException(string.Format("{0} has add {1} as parent.", child.Key, child.Parent.Key));

            }

            child.Parent = parent;

            parent.Children.Add(child);

        }

  

        public RedTipTreeNode GetRootNode()

        {

            return rootNode;

        }

    }

}
```