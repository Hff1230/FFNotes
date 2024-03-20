```


using System;

using System.Collections.Generic;

using UnityEngine;

  

namespace DayZ

{

    public partial class Main : MonoBehaviour

    {

        void Awake()

        {

            NativeCode.InjectFixManager.Instance.LoadFix();

            CCLoadSprite.MappingFunc = GameRenderChangeManager.Instance.MappingPicName;

            CCNodeCache.Instance.whiteList = new HashSet<Type>()

            {

                typeof(WorldCityProtectNode),

                typeof(CCNode),

                typeof(CCSprite),

            };

            ContainerRegister();

            GameHandlerRegister();

            UIModuleInit.Init();

            Global.runInAppDelegateForGlobalValue();

            CCDirector.getInstance().runWithScene(SceneContainer.create());

            Timing.RunCoroutine(CreateSpriteAndNodes(), "Pre_Create_CCNode");

            SceneController.getInstance().gotoLoading(true);

        }

  

        private void ContainerRegister()

        {

            DayZ.Container.Instance.Register<IExpeditionManager, ExpeditionManager>();

            DayZ.Container.Instance.Register<IPowerManager, PowerManager>();


        }

  

        private void GameHandlerRegister()

        {

            DayZ.Container.Instance.RegisterGameHandler<IGameWelcomeHandler, EmpireGameWelcomeHandler, RedAlertGameWelcomeHandler>();

            DayZ.Container.Instance.RegisterGameHandler<IHeroModelShowHandler, EmpireHeroModelShowHandler, RedAlertHeroModelShowHandler>();

        }

  

        private IEnumerator<float> CreateSpriteAndNodes()

        {

            this.RegisterUIExtensions();

#if GS_TOOL

            GSTool.createInstance();

#endif

            yield return 1;

        }

    }

}
```