/** Mirrored client preview only. Server always recomputes the delivery charge. */
export type DeliveryZone={id:string;name:string;feeCents:number;neighborhoods:string[]};
export function neighborhoodKey(input:string):string{
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
export function deliveryQuote(neighborhood:string,zones:DeliveryZone[],defaultFeeCents:number):
  {feeCents:number;zoneId:string|null}|null{
  const key=neighborhoodKey(neighborhood);
  if(!zones.length)return {feeCents:defaultFeeCents,zoneId:null};
  if(!key)return null;
  const zone=zones.find(z=>z.neighborhoods.some(n=>neighborhoodKey(n)===key));
  return zone?{feeCents:zone.feeCents,zoneId:zone.id}:null;
}
