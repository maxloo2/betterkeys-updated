﻿using EFT.UI;
using EFT.UI.DragAndDrop;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

namespace BetterKeys
{
    public static class Resources
    {
        public static Dictionary<string, Sprite> iconCache = new Dictionary<string, Sprite>();
        static BetterKeysItemViewPanel[] viewPanels = { null, null, null, null, null };

            public static BetterKeysItemViewPanel GetEditOffsetWindowTemplate(int itemId, QuestItemViewPanel original = null)
        {
            if(viewPanels[itemId] != null)
                return viewPanels[itemId];

            if (original == null)
                throw new ArgumentNullException("original", "Can't be null if template isn't created yet!");

            QuestItemViewPanel clone = GameObject.Instantiate<QuestItemViewPanel>(original);
            GameObject newObject = clone.gameObject;
            clone.transform.parent = BetterKeys.GameObjectStorage;
            newObject.name = "BetterKeysItem";

            BetterKeysItemViewPanel result = newObject.AddComponent<BetterKeysItemViewPanel>();

            //Copy fields over
            result.CopyFieldsFromQuestView(clone);

            //Set custom sprite
            if (result.iconImage != null)
            {
                result.iconImage.sprite = itemId switch
                {
                    1 => iconCache["betterkeys_s"] ?? UnityEngine.Resources.Load<Sprite>("characteristics/icons/icon_info_faction"),
                    2 => iconCache["betterkeys_a"] ?? UnityEngine.Resources.Load<Sprite>("characteristics/icons/icon_info_faction"),
                    3 => iconCache["betterkeys_b"] ?? UnityEngine.Resources.Load<Sprite>("characteristics/icons/icon_info_faction"),
                    4 => iconCache["betterkeys_c"] ?? UnityEngine.Resources.Load<Sprite>("characteristics/icons/icon_info_faction"),
                    _ => iconCache["betterkeys_trash"] ?? UnityEngine.Resources.Load<Sprite>("characteristics/icons/icon_info_faction"),
                
                };
            }

            GameObject.DestroyImmediate(clone);

            viewPanels[itemId] = result;
            return viewPanels[itemId];
        }

        public static void CopyFieldsFromQuestView(this BetterKeysItemViewPanel viewItem, QuestItemViewPanel questItem)
        {
            viewItem.iconImage = typeof(QuestItemViewPanel).GetField("_questIconImage", BindingFlags.NonPublic | BindingFlags.Instance).GetValue(questItem) as Image;
        }


        public static async Task LoadTexture(string id, string path)
        {
            using (UnityWebRequest uwr = UnityWebRequestTexture.GetTexture(path))
            {
                uwr.SendWebRequest();

                while (!uwr.isDone)
                {
                    await Task.Delay(100);
                }

                if (uwr.responseCode != 200)
                {
                    //Debug.LogError($"[{BetterKeys.ModInfo.name}] Request error {uwr.responseCode}: {uwr.error}");
                }
                else
                {
                    // Get downloaded asset bundle
                    //Debug.LogError($"[{BetterKeys.ModInfo.name}] Retrieved texture! {id} from {path}");
                    Texture2D cachedTexture = DownloadHandlerTexture.GetContent(uwr);
                    iconCache.Add(id, Sprite.Create(cachedTexture, new Rect(0, 0, cachedTexture.width, cachedTexture.height), new Vector2(0, 0)));
                }
            }
        }
    }
}
