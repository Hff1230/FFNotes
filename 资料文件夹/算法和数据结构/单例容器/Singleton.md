```
public abstract class Singleton<T> where T : Singleton<T>, new()

    {

        protected static T _instance = null;

  

        public static T Instance {

            get {

                if (_instance == null)

                {

                    _instance = new T();

                    _instance.Initialize();

                }

  

                return _instance;

            }

        }

  

        public static void purgeData()

        {

            if (_instance != null)

                _instance.Destroy();

            _instance = null;

        }

  

        protected virtual void Initialize() { }

  

        protected virtual void Destroy() { }

    }
```