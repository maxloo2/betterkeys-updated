# BetterKeys-Updated

Better key information for SPT-AKI. Originally by SirTyler, updated by maxloo2.

## Features & Changes

- Colored background for keys and keycards according to which map they belongs to.
- Maps, Extracts, Quests and Loot information in the item descriptions.
- **[New]** Add description for junk keys (previously keys that are not used anywhere are not indicated as such by the mod)
- **[New]** All features can be toggled on/ off in `configs.json` (see below).
- **[Updated]** Auto-update from GitHub: key information and locales can be updated without redownloading the whole mod.
- **[Removed]** Key Tier List (I don't think it was actually enabled anyway).

Please refer to the original mod for more/ legacy descriptions: https://hub.sp-tarkov.com/files/file/895-better-keys/

## configs.json

```JSON
{
  "enableAutoUpdate": true, // enable auto update from GitHub
  "backgroundColor": true, // toggle background colors
  "descriptionInfo": true, // toggle item descriptions
  "yellowMarkedKeys": true, // when true, marked keys are always yellow (vanilla behavior)
  "requiredInQuests": true, // Toggle Quests Info
  "requiredForExtracts": true, // toggle Extracts Info
  "behindTheLoock": true, // toggle Loot Info
  "backgroundColors": {...} // Please refer to configs/README.md
}
```

## To-do List

- Fix auto-update (it works now but not quite)
- Clean up unused code for Key Tier List in the client mod

##

If you find any problems please comment or ping me on SPT discord: @maxloo2

Feel free to make pull requests on GitHub if you find anything outdated/ broken, I will be actively maintaining this repository even if I don't have time to make new updates.

I do not have too much experiences with Unity/ C# modding so any help in that regard will be much appreciated!
