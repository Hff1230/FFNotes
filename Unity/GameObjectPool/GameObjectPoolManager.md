```
using UnityEngine;

using System;

using System.Collections.Generic;

namespace DayZ

{

    public class GameObjectPoolManager

    {

        private Dictionary<string, Queue<GameObject>> pools = new Dictionary<string, Queue<GameObject>>();

        private Dictionary<string, GameObject> prefabs = new Dictionary<string, GameObject>();

  
  

        private Transform poolsParent;

        public GameObjectPoolManager(Transform poolsParent)

        {

            this.poolsParent = poolsParent;

        }

        public GameObject GetGameObjectFromPool(string name)

        {

            GameObject result = null;

            if (this.pools.ContainsKey(name) && pools[name].Count > 0)

                result = pools[name].Dequeue();

            else

            {

                GameObject prefab = null;

                if (!prefabs.TryGetValue(name, out prefab))

                {

                    prefab = ResourceLoader.Instance.Load<GameObject>(name);

                    if (prefab == null)

                        return null;

                    prefabs.Add(name, prefab);

                }

                result = GameObject.Instantiate(prefab);

                result.name = name;

            }

            result.SetActive(true);

            return result;

        }

        public void RecycleGameObjectToPool(object obj, string name)

        {

            GameObject go = (GameObject)obj;

            go.transform.localScale = Vector3.one;

            go.transform.localEulerAngles = Vector3.zero;

            go.transform.localPosition = Vector3.zero;

            if (!this.pools.ContainsKey(name))

                this.pools.Add(name, new Queue<GameObject>());

            this.pools[name].Enqueue(go);

            go.transform.SetParent(poolsParent, false);

            go.SetActive(false);

        }

    }

}
```