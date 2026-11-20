import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListControls, Pagination } from "@/components/list-controls";
import { LoadProblem, ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/catalogue";
import { alternates } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { readListParams, listHref } from "@/lib/list-params";
import { text } from "@/lib/site";

type Props = PageProps<"/[lang]/category/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, { lang, t }, categories] = await Promise.all([params, getI18n(), getCategories()]);
  const category = categories?.find((item) => item.slug === slug);
  if (!category) return {};

  const name = text(category.name, lang);
  return {
    title: name,
    description: t.list.categoryDescription(name),
    alternates: alternates(lang, `/category/${slug}`),
  };
}

async function CategoryProducts({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort, inStockOnly, page } = readListParams(await searchParams);

  const [categories, { lang, t, path: localized }] = await Promise.all([getCategories(), getI18n()]);
  if (!categories) return <LoadProblem />;

  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const list = await getProducts({ category: slug, sort, inStock: inStockOnly ? true : undefined, page });
  const path = localized(`/category/${slug}`);

  return (
    <>
      <nav aria-label={t.nav.breadcrumb} className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Link href={localized("/")} className="flex h-8 items-center text-maroon hover:underline">
          {t.nav.homeCrumb}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{text(category.name, lang)}</span>
      </nav>

      <h1 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-maroon md:text-4xl">
        {text(category.name, lang)}
      </h1>

      <div className="mt-3.5">
        <ListControls action={path} sort={sort} inStockOnly={inStockOnly} />
      </div>

      <div className="mt-4">
        {!list ? (
          <LoadProblem />
        ) : list.items.length === 0 ? (
          <p className="rounded-xl border border-line bg-white px-4 py-6 text-center text-ink-soft">
            {t.list.empty}
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
