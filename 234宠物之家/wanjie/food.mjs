export const FOODS=[
 ['cabbage','卷心菜','veg'],['carrot','胡萝卜','veg'],['tomato','番茄','veg'],['corn','玉米','veg'],['pumpkin','南瓜','veg'],['mushroom','蘑菇','veg'],
 ['apple','苹果','fruit'],['pear','梨','fruit'],['berry','莓果','fruit'],['peach','蜜桃','fruit'],['grape','葡萄','fruit'],['pineapple','菠萝','fruit']
].map(([id,name,group],index)=>({id,name,group,index}));
export const FOOD_BY_ID=Object.fromEntries(FOODS.map(f=>[f.id,f]));
export const FOOD_NAMES={...Object.fromEntries(FOODS.map(f=>[f.id,f.name])),meat:'肉类',veg:'蔬菜',fruit:'水果',spice:'香料'};
export const MAP_FOODS=[['cabbage','carrot','mushroom','apple','pear','berry'],['carrot','tomato','corn','pumpkin','apple','peach'],['tomato','mushroom','grape','pineapple','berry','pear']];
export const stock=(s,id)=>FOOD_BY_ID[id]?(s.pantry?.[id]||0):(s[id]||0);
export const foodIcon=(id,cls='')=>FOOD_BY_ID[id]?`<span class="food-icon ${cls}" style="background-position:${FOOD_BY_ID[id].index%4*100/3}% ${Math.floor(FOOD_BY_ID[id].index/4)*50}%" aria-hidden="true"></span>`:`<span class="food-icon food-emoji ${cls}" aria-hidden="true">${id==='meat'?'🍖':'🌿'}</span>`;
