import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit product" };

async function EditProduct({ params }: Pick<PageProps<"/admin/products/[id]">, "params">) {
  const { id } = await params;
  return <ProductForm id={id} />;
}

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense>
      <EditProduct params={params} />
    </Suspense>
  );
}
