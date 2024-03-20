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


/// <summary>

        /// Resize to list size to fit specified item count.

        /// If list layout is single column or flow horizontally, the height will change to fit.

        /// If list layout is single row or flow vertically, the width will change to fit.

        /// </summary>

        /// <param name="itemCount">Item count</param>

        public void ResizeToFit(int itemCount)

        {

            ResizeToFit(itemCount, 0);

        }

  

        /// <summary>

        /// Resize to list size to fit specified item count.

        /// If list layout is single column or flow horizontally, the height will change to fit.

        /// If list layout is single row or flow vertically, the width will change to fit.

        /// </summary>

        /// <param name="itemCount">>Item count</param>

        /// <param name="minSize">If the result size if smaller than minSize, then use minSize.</param>

        public void ResizeToFit(int itemCount, int minSize)

        {

            EnsureBoundsCorrect();

  

            int curCount = this.numItems;

            if (itemCount > curCount)

                itemCount = curCount;

  

            if (_virtual)

            {

                int lineCount = Mathf.CeilToInt((float)itemCount / _curLineItemCount);

                if (_layout == ListLayoutType.SingleColumn || _layout == ListLayoutType.FlowHorizontal)

                    this.viewHeight = lineCount * _itemSize.y + Math.Max(0, lineCount - 1) * _lineGap;

                else

                    this.viewWidth = lineCount * _itemSize.x + Math.Max(0, lineCount - 1) * _columnGap;

            }

            else if (itemCount == 0)

            {

                if (_layout == ListLayoutType.SingleColumn || _layout == ListLayoutType.FlowHorizontal)

                    this.viewHeight = minSize;

                else

                    this.viewWidth = minSize;

            }

            else

            {

                int i = itemCount - 1;

                GObject obj = null;

                while (i >= 0)

                {

                    obj = this.GetChildAt(i);

                    if (!foldInvisibleItems || obj.visible)

                        break;

                    i--;

                }

                if (i < 0)

                {

                    if (_layout == ListLayoutType.SingleColumn || _layout == ListLayoutType.FlowHorizontal)

                        this.viewHeight = minSize;

                    else

                        this.viewWidth = minSize;

                }

                else

                {

                    float size;

                    if (_layout == ListLayoutType.SingleColumn || _layout == ListLayoutType.FlowHorizontal)

                    {

                        size = obj.y + obj.height;

                        if (size < minSize)

                            size = minSize;

                        this.viewHeight = size;

                    }

                    else

                    {

                        size = obj.x + obj.width;

                        if (size < minSize)

                            size = minSize;

                        this.viewWidth = size;

                    }

                }

            }

        }
```