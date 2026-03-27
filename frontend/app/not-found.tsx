import Link from "next/link";

export default function NotFound() {
  return (
    <div className="cren-page">
      <div className="cren-inner-narrow">
        <section className="cren-surface p-10 text-center">
          <h1 className="cren-heading-xl">Page not found</h1>
          <p className="cren-body mt-2">
            This section may still be in production. Return to the homepage to continue exploring.
          </p>
          <Link href="/" className="cren-btn cren-btn-primary mt-6 inline-flex">
            Back to Home
          </Link>
        </section>
      </div>
    </div>
  );
}
