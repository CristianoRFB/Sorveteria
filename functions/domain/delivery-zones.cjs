"use strict";
/** Neighborhood-based zones, NOT geocoding or proof of geographical boundaries. */
function neighborhoodKey(value){
  if(typeof value!=="string")return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function validateDeliveryZones(input){
  if(!Array.isArray(input)||input.length>20)throw new TypeError("Lista de zonas inválida.");
  const zoneIds=new Set(),neighborhoods=new Set();
  return input.map(zone=>{
    if(!zone||typeof zone!=="object"||Array.isArray(zone)
      ||Object.keys(zone).some(key=>!["id","name","feeCents","neighborhoods"].includes(key))
      ||typeof zone.id!=="string"||! /^[a-z0-9_-]{2,40}$/.test(zone.id)
      ||zoneIds.has(zone.id)
      ||typeof zone.name!=="string"||zone.name.trim().length<2||zone.name.trim().length>80
      ||!Number.isSafeInteger(zone.feeCents)||zone.feeCents<0||zone.feeCents>100000
      ||!Array.isArray(zone.neighborhoods)||zone.neighborhoods.length<1||zone.neighborhoods.length>25)
      throw new TypeError("Zona de entrega inválida.");
    zoneIds.add(zone.id);
    const clean=zone.neighborhoods.map(n=>{
      if(typeof n!=="string"||n.trim().length<2||n.trim().length>100)
        throw new TypeError("Nome de bairro inválido.");
      const key=neighborhoodKey(n);
      if(key.length<2||neighborhoods.has(key))throw new TypeError("Bairro repetido ou inválido.");
      neighborhoods.add(key);
      return n.trim();
    });
    return {id:zone.id,name:zone.name.trim(),feeCents:zone.feeCents,neighborhoods:clean};
  });
}
/** null means delivery is not supported to that address; no client-supplied fee trusted. */
function quoteDeliveryZone(zones,neighborhood,fallbackFeeCents){
  const key=neighborhoodKey(neighborhood);
  if(!key)return null;
  if(!zones.length)return Number.isSafeInteger(fallbackFeeCents)&&fallbackFeeCents>=0
    ?{feeCents:fallbackFeeCents,zoneId:null}:null;
  const zone=zones.find(z=>z.neighborhoods.some(value=>neighborhoodKey(value)===key));
  return zone?{feeCents:zone.feeCents,zoneId:zone.id}:null;
}
module.exports={neighborhoodKey,validateDeliveryZones,quoteDeliveryZone};
