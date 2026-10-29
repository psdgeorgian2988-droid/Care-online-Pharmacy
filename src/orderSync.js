function addMobile(mobiles, value) {
  const digits = String(value || "").replace(/\D/g, "").slice(-10);
  if (digits.length === 10) mobiles.add(digits);
}

export function accountMobiles(user) {
  const mobiles = new Set();
  if (!user || user.isGuest) return mobiles;
  addMobile(mobiles, user.mobile);
  addMobile(mobiles, user.creatorMobile);
  addMobile(mobiles, user.mobileNumber);
  for (const member of Array.isArray(user.familyMembers) ? user.familyMembers : []) {
    addMobile(mobiles, member?.mobile);
  }
  return mobiles;
}

export function ordersForAccount(orders, user) {
  const mobiles = accountMobiles(user);
  if (!mobiles.size) return [];
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const digits = String(order?.mobile || order?.mobileNumber || "").replace(/\D/g, "").slice(-10);
    return digits.length === 10 && mobiles.has(digits);
  });
}

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
