"use strict";
/** Summary of orders CREATED in the selected rolling interval.
 * Not payment settlement, not financial reporting, and no customer PII.
 */
function buildBasicSalesSummary({orderCount,completedCount,cancelledCount,completedAmountCents}){
  const fields=[orderCount,completedCount,cancelledCount,completedAmountCents];
  if(!fields.every(v=>Number.isSafeInteger(v)&&v>=0)
      ||completedCount+cancelledCount>orderCount)throw Error("Invalid aggregate results");
  return {
    totalOrders:orderCount,
    completedOrders:completedCount,
    cancelledOrders:cancelledCount,
    pendingOrders:orderCount-completedCount-cancelledCount,
    completedAmountCents,
    averageCompletedTicketCents:completedCount>0?Math.round(completedAmountCents/completedCount):0,
  };
}
module.exports={buildBasicSalesSummary};
