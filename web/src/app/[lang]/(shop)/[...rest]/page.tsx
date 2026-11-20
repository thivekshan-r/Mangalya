import { notFound } from "next/navigation";

/**
 * Any address that matches no page lands here and shows the site's own
 * "not found" page, with the header and footer, in the right language.
 */
export default function UnknownPage() {
  notFound();
}
