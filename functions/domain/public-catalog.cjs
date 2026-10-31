"use strict";
/** Explicitly project public catalogue fields; never spread Firestore documents. */
const KINDS = new Set(["pot","cone","milkshake","other"]);
function projectPublicCatalog(categories,products){
  const cleanCategories=categories.filter(x=>x?.data?.active===true && typeof x.id==="string" &&
    typeof x.data.name==="string" && Number.isInteger(x.data.sortOrder))
    .map(x=>({id:x.id,name:x.data.name,active:true,sortOrder:x.data.sortOrder}))
    .sort((a,b)=>a.sortOrder-b.sortOrder || a.id.localeCompare(b.id));
  const categoryIds=new Set(cleanCategories.map(x=>x.id));
  const cleanProducts=products.filter(x=>x?.data?.available===true && typeof x.id==="string" &&
    categoryIds.has(x.data.categoryId) && KINDS.has(x.data.kind) &&
    typeof x.data.name==="string" && typeof x.data.description==="string" &&
    Number.isSafeInteger(x.data.priceCents) && x.data.priceCents>=0 && Array.isArray(x.data.optionGroups))
    .map(x=>{
      const d=x.data;
      const groups=d.optionGroups.filter(g=>g && typeof g.id==="string" &&
        typeof g.name==="string" && typeof g.required==="boolean" &&
        Number.isInteger(g.minSelections) && Number.isInteger(g.maxSelections) &&
        Array.isArray(g.options))
        .map(g=>({id:g.id,name:g.name,required:g.required,
          minSelections:g.minSelections,maxSelections:g.maxSelections,
          options:g.options.filter(o=>o && typeof o.id==="string" && typeof o.name==="string"
            && Number.isSafeInteger(o.priceDeltaCents) && typeof o.available==="boolean")
            .map(o=>({id:o.id,name:o.name,priceDeltaCents:o.priceDeltaCents,available:o.available}))}));
      const product={id:x.id,name:d.name,description:d.description,categoryId:d.categoryId,
        kind:d.kind,priceCents:d.priceCents,available:true,optionGroups:groups};
      if(typeof d.imageUrl==="string" && /^https:\/\//i.test(d.imageUrl) && d.imageUrl.length<=2048)
        product.imageUrl=d.imageUrl;
      return product;
    });
  return {categories:cleanCategories,products:cleanProducts};
}
module.exports={projectPublicCatalog};
