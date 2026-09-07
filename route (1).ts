import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = await req.json();

  // Verify the payment really came from Razorpay using the server-side secret.
  // This check must NEVER be skipped or done in the browser.
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("orders")
    .update({ payment_status: "paid", razorpay_payment_id })
    .eq("id", orderId)
    .select("*, order_items(*)")
    .single();

  if (order) {
    for (const item of order.order_items) {
      await supabase.rpc("decrement_variant_stock", { p_variant_id: item.variant_id, p_qty: item.quantity });
    }
    if (!order.is_buy_now) {
      await supabase.from("cart_items").delete().eq("customer_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
