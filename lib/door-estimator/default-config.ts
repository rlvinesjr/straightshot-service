import type { ConstructionCode, DoorEstimatorConfig, FinishTier } from "./types"

const widths = ["8", "9", "10", "12", "14/15/16", "17/18"]
const heights = [7, 8, 9] as const
const costSets: Record<string, number[]> = {
  "essential:standard": [471.58,507.32,581.16,664.49,805.04,950.31,588.29,626.4,726.43,809.78,1043.2,1167.05,738.31,781.19,888.39,981.26,1286.13,1502.84],
  "essential:wood": [610.27,665.75,757.18,875.73,1086.67,1267.17,764.32,824.43,946.47,1073.83,1395.27,1563.13,910.03,971.99,1103.04,1238.84,1629.57,1889.21],
  "comfort:standard": [619.24,681.16,778.83,900.29,1069.41,1302.79,740.69,797.86,916.95,1038.42,1348.05,1510,938.4,997.94,1157.51,1274.22,1664.83,1893.45],
  "comfort:wood": [760.07,839.59,954.86,1111.53,1351.05,1619.63,916.73,995.89,1136.99,1302.46,1677.62,1906.07,1110.12,1191.12,1372.16,1531.8,2008.27,2279.82],
  "premium:standard": [695.48,759.77,864.56,1012.23,1250.39,1488.56,847.89,919.34,1071.77,1233.73,1512.38,1774.38,1083.67,1190.86,1390.91,1598.13,1964.93,2286.42],
  "premium:wood": [828.83,909.81,1031.28,1212.3,1517.13,1788.68,1000.31,1090.82,1262.3,1462.39,1841.95,2117.36,1255.12,1338.53,1606.73,1762.48,2272.15,2612.74],
  "premium:plank": [1077.48,1182.75,1340.67,1575.99,1972.28,2325.28,1300.41,1418.07,1640.99,1901.11,2394.53,2752.57,1631.66,1740.08,2088.74,2291.23,2953.8,3396.56],
}

const priceRows = Object.entries(costSets).flatMap(([key, values]) => {
  const [constructionCode, finishTier] = key.split(":") as [ConstructionCode, FinishTier]
  return heights.flatMap((height, hi) => widths.map((widthGroup, wi) => ({
    constructionCode,
    finishTier,
    widthGroup,
    height,
    vendorCost: values[hi * widths.length + wi],
    active: true,
  })))
})

export const DEFAULT_DOOR_ESTIMATOR_CONFIG: DoorEstimatorConfig = {
  version: 1,
  pricebookName: "Residential Door Pricing - May 2026",
  effectiveDate: "2026-05-04",
  multiplier: 3,
  roundingMethod: "nearest_hundred_minus_one",
  priceEnding: 99,
  removalIncluded: true,
  websiteDisclaimer: "This preliminary estimate assumes a standard residential installation. Final measurements, site conditions, product availability, and opener compatibility must be confirmed on-site before the price is finalized.",
  constructions: [
    { code: "essential", publicName: "Essential Steel", eyebrow: "Best value", description: "A durable non-insulated steel door for homeowners who want the lowest initial price.", specifications: ["Heavy-duty exterior steel", "Two-inch sections", "Reinforced hardware attachment points", "Replaceable bottom seal"], rValue: null, finishTiers: ["standard", "wood"], active: true },
    { code: "comfort", publicName: "Comfort Insulated", eyebrow: "Quieter and more comfortable", description: "An insulated steel door with quieter operation and improved temperature control.", specifications: ["Heavy-duty exterior steel", "Polystyrene insulation", "Finished vinyl interior backing", "Approximately R-6.85"], rValue: 6.85, finishTiers: ["standard", "wood"], active: true },
    { code: "premium", publicName: "Premium Steel-Back", eyebrow: "Strongest and quietest", description: "A steel-interior insulated door with improved strength, sound reduction, and a clean finished interior.", specifications: ["Steel exterior and interior", "Two-inch insulated construction", "Full-height reinforcement", "Approximately R-10.25"], rValue: 10.25, finishTiers: ["standard", "wood", "plank"], active: true },
  ],
  styles: [
    ["traditional-raised","Traditional Raised Panel","Traditional","A familiar raised-panel design that works with nearly any home.",["essential","comfort","premium"],["standard"],"short"],
    ["short-recessed","Short Recessed Panel","Traditional","Clean recessed details with a balanced, classic appearance.",["essential","comfort","premium"],["standard","wood"],"short"],
    ["carriage-short","Carriage House Short Panel","Carriage House","Short carriage-house panels with a handcrafted look.",["essential","comfort","premium"],["standard","wood"],"short"],
    ["carriage-long","Carriage House Long Panel","Carriage House","Long carriage-house panels that suit wider openings.",["essential","comfort","premium"],["standard","wood"],"carriage"],
    ["flush","Flush Panel","Modern","A simple flat-panel door with a clean modern appearance.",["essential","comfort","premium"],["standard"],"contemporary"],
    ["louvered","Louvered Panel","Carriage House","Subtle horizontal texture with traditional character.",["essential","comfort","premium"],["standard","wood"],"carriage"],
    ["long-recessed","Long Recessed Panel","Traditional","Wide recessed panels that create a strong, uncluttered look.",["essential","comfort","premium"],["standard","wood"],"long"],
    ["raised-ranch","Raised Ranch Panel","Traditional","Long raised panels with a wider, substantial appearance.",["essential","comfort","premium"],["standard"],"long"],
    ["horizontal-plank","Horizontal Plank","Modern","A premium horizontal-plank design with wood-look finishes.",["premium"],["plank"],"contemporary"],
  ].map(([code, publicName, category, description, constructionCodes, finishTiers, windowGroup]) => ({ code, publicName, category, description, imagePath: code === "horizontal-plank" ? "" : `/door-styles/${code}.jpg`, constructionCodes, finishTiers, windowGroup, websiteEnabled: true, fieldEnabled: true, active: true })) as DoorEstimatorConfig["styles"],
  colors: [
    ["white","White","#f4f2e9","standard"],["almond","Almond","#d8cbaa","standard"],["sandstone","Sandstone","#b6a487","standard"],["desert-tan","Desert Tan","#b9976f","standard"],["brown","Brown","#4b2f26","standard"],["gray","Gray","#858b8d","standard"],["charcoal","Charcoal","#3e4548","standard"],["black","Black","#111111","standard"],
  ].map(([code, publicName, swatch, finishTier]) => ({ code, publicName, swatch, finishTier, websiteEnabled: true, fieldEnabled: true, active: true })) as DoorEstimatorConfig["colors"],
  windows: [
    { code: "none", publicName: "No Windows", description: "Solid top section.", groups: ["short","long","carriage","contemporary"], glazing: "none", costs: {}, websiteEnabled: true, fieldEnabled: true, active: true },
    { code: "plain", publicName: "Plain Glass", description: "Simple clear glass for natural light.", groups: ["short","long","carriage"], glazing: "plain", costs: { essential:{short:29.15,long:55.65,carriage:75.79}, comfort:{short:38.69,long:71.55,carriage:90.63}, premium:{short:38.69,long:71.55,carriage:90.63} }, websiteEnabled: true, fieldEnabled: true, active: true },
    { code: "decorative", publicName: "Decorative Glass", description: "Decorative inserts for added character.", groups: ["short","long","carriage"], glazing: "decorative", costs: { essential:{short:40.81,long:74.73,carriage:94.87}, comfort:{short:50.35,long:90.63,carriage:109.71}, premium:{short:50.35,long:90.63,carriage:109.71} }, websiteEnabled: true, fieldEnabled: true, active: true },
    { code: "satin", publicName: "Satin Glass", description: "Privacy glass that still allows light through.", groups: ["short","long"], glazing: "satin", costs: { essential:{short:73.67,long:106}, comfort:{short:84.27,long:116.6}, premium:{short:84.27,long:116.6} }, websiteEnabled: true, fieldEnabled: true, active: true },
    { code: "contemporary-clear", publicName: "Contemporary Clear", description: "Clean rectangular modern glass.", groups: ["contemporary"], glazing: "plain", costs: { essential:{contemporary:101.92}, comfort:{contemporary:156.01}, premium:{contemporary:156.01} }, websiteEnabled: true, fieldEnabled: true, active: true },
  ],
  openers: [
    { code:"keep-existing", publicName:"Keep Existing Opener", description:"Reconnect the existing opener when compatible.", features:["Compatibility confirmed on-site"], costsByHeight:{7:0,8:0,9:0}, websiteEnabled:true, fieldEnabled:true, active:true },
    { code:"reliable-chain", publicName:"Reliable Chain Drive", description:"Dependable smart opener for everyday use.", features:["Smartphone control","Safety sensors"], costsByHeight:{7:300.27,8:337.2,9:398.96}, websiteEnabled:true, fieldEnabled:true, active:true },
    { code:"battery-belt", publicName:"Belt Drive with Battery Backup", description:"Quiet operation with backup power.", features:["Battery backup","Smartphone control"], costsByHeight:{7:506.45,8:544.75,9:632.55}, websiteEnabled:true, fieldEnabled:true, active:true },
    { code:"premium-smart", publicName:"Premium Smart Opener", description:"Premium lighting and battery backup.", features:["Battery backup","Premium lighting"], costsByHeight:{7:557.64,8:598.34,9:652.08}, websiteEnabled:true, fieldEnabled:true, active:true },
    { code:"wall-mount", publicName:"Space-Saving Wall-Mount", description:"Mounts beside the door to free ceiling space.", features:["Compatibility required"], costsByHeight:{7:659.15,8:659.15,9:659.15}, websiteEnabled:false, fieldEnabled:true, active:true },
  ],
  priceRows,
}
