import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListControls, Pagination } from "@/components/list-controls";
import { LoadProblem, ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/catalogue";
import { readListParams, listHref } from "@/lib/list-params";
import { text } from "@/lib/site";

type Props = PageProps<"/category/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories())?.find((item) => item.slug === slug);
  if (!category) return { title: "Category" };

  const name = text(category.name);
  return {
    title: name,
    description: `${name} from Mangalya. Browse and order on WhatsApp.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

async function CategoryProducts({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort, inStockOnly, page } = readListParams(await searchParams);

  const categories = await getCategories();
  if (!categories) return <LoadProblem />;

  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const list = await getProducts({ category: slug, sort, inStock: inStockOnly ? true : undefined, page });
  const path = `/category/${slug}`;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Link href="/" className="flex h-8 items-center text-maroon hover:underline">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span>{text(category.name)}</span>
      </nav>

      <h1 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-maroon md:text-4xl">
        {text(category.name)}
      </h1>

      <div className="mt-3.5">
        <ListControls action={path} sort={sort} inStockOnly={inStockOnly} />
      </div>

      <div className="mt-4">
        {!list ? (
          <LoadProblem />
        ) : list.items.length === 0 ? (
          <p className="rounded-xl border border-line bg-white px-4 py-6 text-center text-ink-soft">
            Nothing here yet. Message us on WhatsApp and we will tell you what is in the shop.
          </p>
        ) : (
          <>
            <ProductGrid products={list.items} />
            <Pagination
              page={list.page}
              pages={list.pages}
              hrefs={{
                previous: listHref(path, { sort, inStockOnly, page: list.page - 1 }),
                next: listHref(path, { sort, inStockOnly, page: list.page + 1 }),
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

export default function CategoryPage(props: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 md:px-6 md:pt-6">
      <Suspense
        fallback={
          <div className="pt-24">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <CategoryProducts {...props} />
      </Suspense>
    </div>
  );
}
