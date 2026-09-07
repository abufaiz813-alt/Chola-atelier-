import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { lines, addressId, paymentMethod, isBuyNow, total, subtotal } = await req.json();

  if (!lines?.length) return NextResponse.json({ error: "No items to order" }, { status: 400 });
  if (!addressId) return NextResponse.json({ error: "Select a delivery address" }, { status: 400 });

  // Re-check stock server-side before charging anyone
  for (const line of lines) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("stock")
      .eq("id", line.variant_id)
      .single();
    if (!variant || variant.stock < line.quantity) {
      return NextResponse.json({ error: `${line.product_name} is out of stock` }, { status: 409 });
    }
  }

  const orderNumber = `CA-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: user.id,
      address_id: addressId,
      subtotal,
      total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "pending" : "pending",
      order_status: "placed",
      is_buy_now: isBuyNow,
    })
    .select()
    .single();

  if (error || !order) return NextResponse.json({ error: error?.message ?? "Order failed" }, { status: 500 });

  await supabase.from("order_items").insert(
    lines.map((l: any) => ({
      order_id: order.id,
      variant_id: l.variant_id,
      product_name: l.product_name,
      colour: l.colour,
      size: l.size,
      quantity: l.quantity,
      price: l.price,
    }))
  );

  // Decrease stock immediately for COD; for online payment, do it after verify
  if (paymentMethod === "cod") {
    for (const line of lines) {
      await supabase.rpc("decrement_variant_stock", { p_variant_id: line.variant_id, p_qty: line.quantity });
    }
    if (!isBuyNow) await supabase.from("cart_items").delete().eq("customer_id", user.id);
    return NextResponse.json({ id: order.id });
  }

  // Razorpay is only created here — for online payments only — so a COD
  // order never depends on Razorpay keys being configured at all.
  if (!process.env.RAZORPAY_KEY_SECRET || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return NextResponse.json(
      { error: "Online payment isn't set up yet — add your Razorpay keys to .env.local, or choose Cash on delivery." },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET, // never sent to the browser
  });

  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(total * 100),
    currency: "INR",
    receipt: orderNumber,
  });

  await supabase.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

  return NextResponse.json({ id: order.id, razorpayOrderId: rzpOrder.id });
}
