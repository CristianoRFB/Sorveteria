/** Paginated catalogue aggregation; an HTTP page size is not a plan quota. */
export type CatalogPage<C,P>={categories:C[];products:P[];nextCursor:string|null};
export async function collectCatalogPages<C,P>(
  readPage:(cursor:string|null)=>Promise<CatalogPage<C,P>>,
):Promise<{categories:C[];products:P[]}>{
  const seen=new Set<string>();
  const products:P[]=[];
  let categories:C[]=[];
  let cursor:string|null=null;
  for(;;){
    const page=await readPage(cursor);
    if(!Array.isArray(page.categories)||!Array.isArray(page.products))
      throw new Error("Resposta do catálogo inválida.");
    if(cursor===null)categories=page.categories;
    products.push(...page.products);
    const next=page.nextCursor;
    if(next===null)return {categories,products};
    if(typeof next!=="string"||!next||seen.has(next))
      throw new Error("Paginação inconsistente do catálogo; tente novamente.");
    seen.add(next);
    cursor=next;
  }
}
