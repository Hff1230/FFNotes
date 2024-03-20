Glist 用法

```  
void Init(){
            this.heroList = this._mainView.GetChild("n1").asList;

            this.heroList.itemRenderer = HeroListItemRenderer;

            this.heroList.ItemReversal = LocalTextController.shared().checkNeedRightToLeft();

            this.heroList.onClickItem.Add(OnClickHeroListItem);

            // this.heroList.SetVirtual();  

            this.heroList.draggable = false;
           
            }
            
           private void OnClickHeroListItem(EventContext context)
        {            SoundController.sharedSound().playEffects(Global.Music_Sfx_click_button);

            GObject obj = context.data as GObject;

            int index = heroList.ChildIndexToItemIndex(heroList.GetChildIndex(obj));

            FBHeroView.create(this.heroLists, false, index);

            GuideTrigger();

        }

  

        private void HeroListItemRenderer(int index, GObject item)

        {

            (item as HeroListCellComponent).SetData(this.heroLists[index]);

        }
        
       GList.ItemIndexToChildIndex(index))
```