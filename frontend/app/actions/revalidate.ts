"use server";

import { revalidateTag } from "next/cache";

export async function revalidateProducts() {
  revalidateTag("products", "max");
}

export async function revalidateProduct(id: number | string) {
  revalidateTag(`product-${id}`, "max");
}

export async function revalidateCategories() {
  revalidateTag("categories", "max");
}
