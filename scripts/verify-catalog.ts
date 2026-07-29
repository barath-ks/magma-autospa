import { db } from "../lib/db";
const mockGetServerSession = require("next-auth/next");
import { v4 as uuidv4 } from "uuid";

// Import Route Handlers
const adminServicesRoute = require("../app/api/admin/services/route");
const adminServicesIdRoute = require("../app/api/admin/services/[id]/route");
const adminOffersRoute = require("../app/api/admin/offers/route");
const adminOffersIdRoute = require("../app/api/admin/offers/[id]/route");
const staffOffersRoute = require("../app/api/staff/offers/route");
const staffRedemptionsRoute = require("../app/api/staff/redemptions/route");

async function mockSession(role: string, branch_id: string, user_id: string) {
  return {
    user: { id: user_id, role, branch_id }
  };
}

async function run() {
  console.log("Setting up Catalog CRUD verification...\n");
  mockGetServerSession.getServerSession = async () => (global as any).testSession;

  const branchId = uuidv4();
  const adminId = uuidv4();
  const staffId = uuidv4();
  const customerId = uuidv4();

  await db.execute({ sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)", args: [branchId, `Test Branch ${Date.now()}`, "A"] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [adminId, `ADMIN-${Date.now()}`, "hash", "admin", "Admin", branchId] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [staffId, `STAFF-${Date.now()}`, "hash", "staff", "Staff", branchId] });
  await db.execute({ sql: "INSERT INTO customers (id, name, phone, points_balance, branch_id) VALUES (?, ?, ?, ?, ?)", args: [customerId, "Test Customer", `555-${Date.now()}`, 500, branchId] });

  console.log("=== 1. SECURITY CHECKS (403 for non-Admin) ===");
  (global as any).testSession = await mockSession("staff", branchId, staffId);
  const reqPostServiceStaff = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Fail", price: 10, points_earned: 5 }) });
  const resPostServiceStaff = await adminServicesRoute.POST(reqPostServiceStaff);
  console.log("Staff POST Service Status:", resPostServiceStaff.status);
  
  const reqPostOfferStaff = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Fail", points_required: 10, branch_id: branchId }) });
  const resPostOfferStaff = await adminOffersRoute.POST(reqPostOfferStaff);
  console.log("Staff POST Offer Status:", resPostOfferStaff.status);


  console.log("\n=== 2. SERVICES CRUD ===");
  (global as any).testSession = await mockSession("admin", branchId, adminId);
  
  // Validation Check: Zero Price
  console.log("Testing zero price validation:");
  const reqZeroPrice = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Test Zero", price: 0, points_earned: 5 }) });
  const resZeroPrice = await adminServicesRoute.POST(reqZeroPrice);
  console.log("Zero Price Status:", resZeroPrice.status);
  console.log("Zero Price Response:", JSON.stringify(await resZeroPrice.json()));

  // Create
  console.log("Creating Service:");
  const reqCreateService = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Basic Wash", description: "Standard exterior wash", price: 500, points_earned: 50 }) });
  const resCreateService = await adminServicesRoute.POST(reqCreateService);
  const serviceData = await resCreateService.json();
  const serviceId = serviceData.id;
  console.log("Create Status:", resCreateService.status, "| ID:", serviceId);

  // Edit
  console.log("Editing Service:");
  const reqEditService = new Request(`http://localhost/api/admin/services/${serviceId}`, { method: "PATCH", body: JSON.stringify({ price: 600 }) });
  const resEditService = await adminServicesIdRoute.PATCH(reqEditService, { params: { id: serviceId } });
  console.log("Edit Status:", resEditService.status);

  // Soft Delete
  console.log("Soft Deleting Service:");
  const reqDelService = new Request(`http://localhost/api/admin/services/${serviceId}`, { method: "DELETE" });
  const resDelService = await adminServicesIdRoute.DELETE(reqDelService, { params: { id: serviceId } });
  console.log("Delete Status:", resDelService.status);

  const dbService = await db.execute({ sql: "SELECT is_active, price FROM services WHERE id = ?", args: [serviceId] });
  console.log("DB Service Post-Delete:", JSON.stringify(dbService.rows[0]));


  console.log("\n=== 3. OFFERS CRUD & REDEMPTION ===");
  // Create Offer
  console.log("Creating Offer:");
  const reqCreateOffer = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Free Wax", description: "Free wax coating", points_required: 100, branch_id: branchId }) });
  const resCreateOffer = await adminOffersRoute.POST(reqCreateOffer);
  const offerData = await resCreateOffer.json();
  const offerId = offerData.id;
  console.log("Create Status:", resCreateOffer.status, "| ID:", offerId);

  // Soft Delete Offer
  console.log("Soft Deleting Offer:");
  const reqDelOffer = new Request(`http://localhost/api/admin/offers/${offerId}`, { method: "DELETE" });
  const resDelOffer = await adminOffersIdRoute.DELETE(reqDelOffer, { params: { id: offerId } });
  console.log("Delete Status:", resDelOffer.status);
  
  const dbOffer = await db.execute({ sql: "SELECT is_active FROM offers WHERE id = ?", args: [offerId] });
  console.log("DB Offer Post-Delete:", JSON.stringify(dbOffer.rows[0]));

  // Verify Staff GET Offers hides inactive
  console.log("Verifying Staff Offers Endpoint:");
  (global as any).testSession = await mockSession("staff", branchId, staffId);
  const reqStaffOffers = new Request("http://localhost/api");
  const resStaffOffers = await staffOffersRoute.GET(reqStaffOffers);
  const staffOffersData = await resStaffOffers.json();
  const offerInList = staffOffersData.offers.find((o: any) => o.id === offerId);
  console.log("Is inactive offer in Staff list?:", !!offerInList);

  // Verify Staff Redemption API rejects inactive offer
  console.log("Verifying direct API redemption on inactive offer:");
  const reqRedeem = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ customer_id: customerId, offer_id: offerId }) });
  const resRedeem = await staffRedemptionsRoute.POST(reqRedeem);
  console.log("Redemption Status:", resRedeem.status);
  console.log("Redemption Response:", JSON.stringify(await resRedeem.json()));

  const dbCustomer = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("Customer Points Balance (Should still be 500):", dbCustomer.rows[0].points_balance);

  console.log("\nVerification complete!");
}

run().catch(console.error);
