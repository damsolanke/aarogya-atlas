import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-zinc-100">
      <div className="aurora" />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-28 text-center">
        <div className="ticker mb-4 inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{background: "var(--danger)"}} />
          <span className="v">404</span>
          <span className="sep">│</span>
          <span>no facility found in this region</span>
        </div>

        <h1 className="display text-[44px] leading-tight text-zinc-50 sm:text-[56px]">
          The map ends, but{" "}
          <span className="display-italic" style={{color: "var(--accent-saffron)"}}>
            care doesn&apos;t.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-zinc-400">
          We charted 10,000 facilities across India. This page isn&apos;t one of them. Try the
          atlas instead — every recommendation cites a real <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[12px] text-cyan-300">vf-*</code> id from the Virtue
          Foundation dataset.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium ring-1 transition-colors"
            style={{background: "rgba(232,146,61,0.10)", color: "var(--accent-saffron)", borderColor: "rgba(232,146,61,0.35)"}}
          >
            Back to Atlas
          </Link>
          <Link
            href="/equity"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            See where coverage isn&apos;t equal →
          </Link>
        </div>

        <div className="mt-12 ticker">
          <span>tip</span>
          <span className="sep">·</span>
          <span>press <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-px text-[10px]">⌘ K</kbd> anywhere to jump to a query, page, or photo triage</span>
        </div>
      </main>
    </div>
  );
}
