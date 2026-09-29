export function customerMobilesFromOrders(orders = [], profile = null) {
  const mobiles = new Set();
  for (const row of Array.isArray(orders) ? orders : []) {
    const mobile = String(row?.mobile || row?.mobileNumber || "").replace(/\D/g, "");
    if (mobile.length === 10) mobiles.add(mobile);
  }
  const fromProfile = String(profile?.mobile || profile?.mobileNumber || "").replace(
    /\D/g,
    ""
  );
  if (fromProfile.length === 10) mobiles.add(fromProfile);
  return [...mobiles];
}
