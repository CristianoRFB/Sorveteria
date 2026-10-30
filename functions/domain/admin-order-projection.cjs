"use strict";
/**
 * Owner order projection: only fields rendered in the operational panel.
 * Never spread Firestore documents, nested customer or item objects.
 */
const str = (value) => typeof value === "string" ? value : "";
const cents = (value) => Number.isSafeInteger(value) ? value : 0;
const safeSelections = (raw) => {
  const result = Object.create(null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  for (const [key,value] of Object.entries(raw)) {
    if (/^[a-zA-Z0-9_-]{1,120}$/.test(key) && Array.isArray(value)) {
      result[key] = value.filter(x => typeof x === "string").slice(0,30);
    }
  }
  return Object.assign({},result);
};
function projectAdminOrder(id, tenantId, record) {
  const order = record || {};
  const customer = order.customer || {};
  const address = order.address;
  const money = order.money || {};
  const source = order.source || {};
  return {
    id,tenantId,
    publicCode:str(order.publicCode),
    status:str(order.status),
    customer:{name:str(customer.name),phone:str(customer.phone)},
    address:address && typeof address === "object" ? {
      street:str(address.street),number:str(address.number),neighborhood:str(address.neighborhood),
      reference:str(address.reference),
    } : null,
    fulfillmentMode:str(order.fulfillmentMode),
    source:{
      channel:str(source.channel),
      qrCodeId:str(source.qrCodeId),
      tableId:str(source.tableId),
    },
    items:Array.isArray(order.items) ? order.items.slice(0,100).map(item => ({
      productId:str(item?.productId),
      name:str(item?.name),
      quantity:cents(item?.quantity),
      selections:safeSelections(item?.selections),
      unitPriceCents:cents(item?.unitPriceCents),
      lineTotalCents:cents(item?.lineTotalCents),
    })) : [],
    paymentMethodId:str(order.paymentMethodId),
    money:{
      subtotalCents:cents(money.subtotalCents),
      deliveryFeeCents:cents(money.deliveryFeeCents),
      discountCents:cents(money.discountCents),
      totalCents:cents(money.totalCents),
    },
    estimatedMinutes:Number.isInteger(order.estimatedMinutes) ? order.estimatedMinutes : null,
  };
}
module.exports = {projectAdminOrder};
