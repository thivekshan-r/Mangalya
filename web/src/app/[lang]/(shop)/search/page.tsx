import type { Metadata } from "next";
import { Suspense } from "react";
import { ListControls, Pagination } from "@/components/list-controls";
import { LoadProblem, ProductGrid, ProductGridSkeleton } from "@/components/product-card";
import { SearchBox } from "@/components/search-box";
import { getProducts } from "@/lib/catalogue";
import { getI18n } from "@/lib/i18n-server";
import { listHref, readListParams } from "@/lib/list-params";

type Props = PageProps<"/[lang]/search">;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.search.title,
    robots: { index: false }, // search result pages should not appear in Google
  };
}

async function SearchResults({ searchParams }: Pick<Props, "searchParams">) {
  const [{ q, sort, inStockOnly, page }, { t, path }] = await Promise.all([searchParams.then(readListParams), getI18n()]);
  const action = path("/search");

  if (!q) {
    return (
      <>
        <SearchBox autoFocus />
        <p className="mt-4 text-ink-soft">{t.search.hint}</p>
      </>
    );
  }

  const list = await getProducts({ q, sort, inStock: inStockOnly ? true : undefined, page });

  return (
    <>
      <SearchBox defaultValue={q} />

      {!list ? (
        <div className="mt-4">
          <LoadProblem />
        </div>
      ) : list.total === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-white px-4 py-6 text-center text-ink-soft">
          {t.search.none(q)}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-ink-soft" role="status">
            {t.search.results(list.total, q)}
          </p>
          <div className="mt-3">
            <ListControls action={action} sort={sort} inStockOnly={inStockOnly} q={q} />
          </div>
          <div className="mt-4">
            <ProductGrid products={list.items} />
          </div>
          <Pagination
            page={list.page}
            pages={list.pages}
            hrefs={{
              previous: listHref(action, { q, sort, inStockOnly, page: list.page - 1 }),
              next: listHref(action, { q, sort, inStockOnly, page: list.page + 1 }),
            }}
          />
        </>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-6">
      <h1 className="mb-3 font-serif text-[26px] font-semibold text-maroon md:text-4xl">{t.search.title}</h1>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
