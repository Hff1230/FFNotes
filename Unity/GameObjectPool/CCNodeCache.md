```
public class CCNodeCache : SingletonMono<CCNodeCache>

    {

        public GameObject poolsParent;

  

        public int reusedTime = 0;

  

        public HashSet<Type> whiteList;

  

        private Dictionary<Type, Queue<CCNode>> pools = new Dictionary<Type, Queue<CCNode>>();

  

        public Queue<CCNode> deleteQueue = new Queue<CCNode>();

  

        public List<string> typeNoSetInWhite = new List<string>();

  

        //粒子单独用一个缓存池

        private Dictionary<string, Queue<CCParticleSystemQuad>> particlePool = new Dictionary<string, Queue<CCParticleSystemQuad>>();

  

        //CCNode  骨骼动画单独用一个缓存池

        private Dictionary<string, Queue<IFSkeletonAnimation>> dragonbonesPool = new Dictionary<string, Queue<IFSkeletonAnimation>>();

  

        //建筑单独一个缓存池

        private Dictionary<string, Queue<CCEmptyNode>> buildPool = new Dictionary<string, Queue<CCEmptyNode>>();

  
  
  

        private Dictionary<string, GameObject> prefabs = new Dictionary<string, GameObject>();

  
  

        private GameObjectPoolManager poolManager;

  

        public void RecycleLive2DObject(GameObject obj, string name)

        {

            this.RecycleGameObject(obj, name);

        }

  

        public GameObject GetLive2DObject(string name)

        {

            if (this.Replace)

            {

                if (name.Contains("Hero10009"))

                {

                    name = name.Replace("Hero10009", "Hero10009_ios");

                }

                else if (name.Contains("Hero10057"))

                {

                    name = name.Replace("Hero10057", "Hero10057_ios");

                }

                else if (name.Contains("Hero10060"))

                {

                    name = name.Replace("Hero10060", "Hero10060_ios");

                }

            }

            return this.GetGameObject(name);

        }

  

        public GameObject GetGameObject(string name)

        {

            return poolManager.GetGameObjectFromPool(name);

        }

        public void RecycleGameObject(GameObject obj, string name)

        {

            poolManager.RecycleGameObjectToPool(obj, name);

        }

  

        [ContextMenu("Test")]

        public void Test()

        {

            foreach (var item in typeNoSetInWhite)

            {

                Debug.LogError("No : " + item);

            }

            //foreach (var item in this.transform.GetComponentsInChildren<SpriteRenderer>(true))

            //{

            //    if (item.transform.localEulerAngles != Vector3.zero)

            //    {

            //        Debug.LogError("Find", item);

            //        return;

            //    }

            //    if (item.material.HasProperty("_SkewX") && item.material.GetFloat("_SkewX") != 0)

            //    {

            //        Debug.LogError("Find", item);

            //        return;

            //    }

            //    if (item.material.HasProperty("_SkewY") && item.material.GetFloat("_SkewY") != 0)

            //    {

            //        Debug.LogError("Find", item);

            //        return;

            //    }

            //}

        }

  

        public bool Replace { get; set; } = false;

  

        protected override void Initialize()

        {

            base.Initialize();

  

            poolsParent = new GameObject("poolsParent");

  

            poolsParent.transform.SetParent(this.transform);

  

            poolsParent.SetActive(false);

  

            poolManager = new GameObjectPoolManager(poolsParent.transform);

        }

  

        public GameObject GetInnerCityGameObject(string name)

        {

            GameObject result = null;

            if (Replace)

                result = this.GetGameObject("CityPrefab/ios_" + name);

            if (result == null)

                result = this.GetGameObject("CityPrefab/" + name);

            return result;

        }

        public GameObject GetInnerCityGameObject2(string name)

        {

            GameObject result = null;

            if (Replace)

                result = this.GetGameObject("SkeletPrefab/ios_" + name);

            if (result == null)

                result = this.GetGameObject("SkeletPrefab/" + name);

  

            return result;

        }

  

        public GameObject GetLandGameObject(string name)

        {

            return this.GetGameObject("WorldMapPiece/3D/MiniMapLand/" + name);

        }

  

        public GameObject GetGameObjectPrefab(string path, string name)

        {

            return this.GetGameObject(path + name);

        }

  

        public CCEmptyNode GetBuildGameObject(string ccbName, string childName, bool iosReplace = false)

        {

            var strKey = string.IsNullOrEmpty(childName) ? ccbName : string.Format("{0}-{1}", ccbName, childName);

            CCEmptyNode result = null;

            if (this.buildPool.ContainsKey(strKey) && buildPool[strKey].Count > 0)

                result = buildPool[strKey].Dequeue();

            else

            {

                GameObject prefab = null;

                if (!prefabs.TryGetValue(strKey, out prefab))

                {

                    if (iosReplace)

                    {

                        prefab = ResourceLoader.Instance.Load<GameObject>("Default/Building/Inner_ios", ccbName);

                    }

                    if (prefab == null)

                    {

                        if (ccbName.Equals("pic411000_2_1_free"))

                        {

                            prefab = ResourceLoader.Instance.Load<GameObject>("Default/Building/Inner_res", ccbName);

                        }

                        else

                        {

                            prefab = ResourceLoader.Instance.Load<GameObject>("Default/Building/Inner", ccbName);

                        }

                        if (!string.IsNullOrEmpty(childName))

                        {

                            var child = prefab.transform.Find(childName);

                            if (null == child)

                                return null;

                            prefab = child.gameObject;

                        }

                    }

                    prefabs.Add(strKey, prefab);

                }

                var go = GameObject.Instantiate(prefab);

                go.name = strKey;

                result = go.transform.GetComponent<CCEmptyNode>();

                result.InitFromPrefab();

            }

  

            result.gameObject.SetActive(true);

            return result;

        }

  

        public void RecycleGameObject(GameObject obj)

        {

            this.RecycleGameObject(obj, obj.name);

        }

  
  
  

        private void LateUpdate()

        {

            while (deleteQueue.Count > 0)

            {

                this.RecycleCCNode(deleteQueue.Dequeue());

            }

        }

  

        public CCNode GetPrototype(Type t)

        {

            if (!this.whiteList.Contains(t))

                return null;

  

            Queue<CCNode> queue = null;

            if (this.pools.TryGetValue(t, out queue) && queue.Count > 0)

            {

                reusedTime++;

                var result = queue.Dequeue();

                result.ReuseFromPool();

                return result;

            }

            else

                return null;

        }

  

        public T GetPrototype<T>() where T : CCNode

        {

            var result = GetPrototype(typeof(T));

            if (result != null)

                return result as T;

            else

                return null;

        }

  

        public void RecycleCCNode(CCNode node)

        {

            if (node.getParent() != null)

                return;

  

            if (node.getChildrenCount() != 0)

            {

                node.removeAllChildren();

            }

            var type = node.GetType();

  

            if (!whiteList.Contains(type) && !this.typeNoSetInWhite.Contains(type.ToString()))

            {

                this.typeNoSetInWhite.Add(type.ToString());

            }

  

            node.ResetToPool();

            node.setVisible(false);

  

            //粒子走单独的缓存池

            if (type == typeof(CCParticleSystemQuad))

            {

                RecycleParticle((CCParticleSystemQuad)node);

            }

            else if (type == typeof(IFSkeletonAnimation))

            {

                RecycleDragonbones((IFSkeletonAnimation)node);

            }

            else if (type == typeof(CCEmptyNode))

            {

                RecycleBuildNode((CCEmptyNode)node);

            }

            else

            {

                Queue<CCNode> queue = null;

                if (!this.pools.TryGetValue(type, out queue))

                {

                    queue = new Queue<CCNode>();

                    this.pools.Add(type, queue);

                }

                queue.Enqueue(node);

            }

        }

  

        private void RecycleParticle(CCParticleSystemQuad particle)

        {

            string name = particle.ParticleName;

            Queue<CCParticleSystemQuad> queue = null;

            if (!this.particlePool.TryGetValue(name, out queue))

            {

                queue = new Queue<CCParticleSystemQuad>();

                this.particlePool.Add(name, queue);

            }

            queue.Enqueue(particle);

        }

  

        public CCParticleSystemQuad GetParticlePrototype(string name)

        {

            //return null;

            reusedTime++;

            Queue<CCParticleSystemQuad> queue = null;

            if (particlePool.TryGetValue(name, out queue) && queue.Count > 0)

            {

                return queue.Dequeue();

            }

            return null;

        }

  
  

        public int dragonbonesCount;

  
  

        private void RecycleDragonbones(IFSkeletonAnimation dragonbones)

        {

            string name = dragonbones.getName();

            Queue<IFSkeletonAnimation> queue = null;

            if (!this.dragonbonesPool.TryGetValue(name, out queue))

            {

                queue = new Queue<IFSkeletonAnimation>();

                this.dragonbonesPool.Add(name, queue);

            }

            queue.Enqueue(dragonbones);

            dragonbonesCount++;

        }

  
  

        public IFSkeletonAnimation GetDragonbonesPrototype(string skeletonDataFileName)

        {

            reusedTime++;

            if (dragonbonesPool.ContainsKey(skeletonDataFileName) && dragonbonesPool[skeletonDataFileName].Count > 0)

            {

                dragonbonesCount--;

                return dragonbonesPool[skeletonDataFileName].Dequeue();

            }

            return null;

        }

  

        private void RecycleBuildNode(CCEmptyNode node)

        {

            string name = node.gameObject.name;

            Queue<CCEmptyNode> queue = null;

            if (!this.buildPool.TryGetValue(name, out queue))

            {

                queue = new Queue<CCEmptyNode>();

                this.buildPool.Add(name, queue);

            }

            queue.Enqueue(node);

        }

    }
```