import { NextResponse } from "next/server";
import { readJsonObject } from "../../../lib/apiRequest";
import { resolveRequestOwner } from "../../../lib/requestOwner";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const { deviceId } = body.data;
    const owner = await resolveRequestOwner(request, deviceId);

    if (!owner || owner.kind !== "user" || typeof deviceId !== "string") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: anonymousProducts, error } = await supabaseAdmin
      .from("tracked_products")
      .select("id, marketplace, asin")
      .eq("device_id", deviceId)
      .is("owner_user_id", null);

    if (error) throw new Error(error.message);

    let claimed = 0;
    let merged = 0;

    for (const product of anonymousProducts ?? []) {
      const { data: existingProduct, error: existingError } =
        await supabaseAdmin
          .from("tracked_products")
          .select("id")
          .eq("owner_user_id", owner.userId)
          .eq("marketplace", product.marketplace)
          .eq("asin", product.asin)
          .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      if (existingProduct) {
        const { error: historyError } = await supabaseAdmin
          .from("price_history")
          .update({ tracked_product_id: existingProduct.id })
          .eq("tracked_product_id", product.id);

        if (historyError) throw new Error(historyError.message);

        const { error: deleteError } = await supabaseAdmin
          .from("tracked_products")
          .delete()
          .eq("id", product.id)
          .is("owner_user_id", null);

        if (deleteError) throw new Error(deleteError.message);
        merged += 1;
        continue;
      }

      const { error: claimError } = await supabaseAdmin
        .from("tracked_products")
        .update({ owner_user_id: owner.userId })
        .eq("id", product.id)
        .is("owner_user_id", null);

      if (claimError) throw new Error(claimError.message);
      claimed += 1;
    }

    const { error: subscriptionError } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ owner_user_id: owner.userId })
      .eq("device_id", deviceId);

    if (subscriptionError) throw new Error(subscriptionError.message);

    return NextResponse.json({ success: true, claimed, merged });
  } catch (error) {
    console.error("Account claim error:", error);
    return NextResponse.json(
      { error: "Could not link browser products to this account" },
      { status: 500 }
    );
  }
}
