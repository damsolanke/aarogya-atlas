import Link from "next/link";
import { ExternalLink, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 text-[11.5px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span lang="sa" className="text-zinc-300">आरोग्य</span>
            <span className="text-zinc-600">·</span>
            <span>
              Built by{" "}
              <span className="text-zinc-200">Dam Solanke</span> · Lead Solutions
              Architect — Healthcare
            </span>
          </div>
          <div className="text-[10.5px] text-zinc-600">
            Hack-Nation 5th edition · Databricks Challenge 03 entry
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/compare" className="hover:text-zinc-200">vs ChatGPT</Link>
          <span className="text-zinc-700">·</span>
          <Link href="/equity" className="hover:text-zinc-200">Equity audit</Link>
          <span className="text-zinc-700">·</span>
          <Link href="/architecture" className="hover:text-zinc-200">Architecture</Link>
          <span className="text-zinc-700">·</span>
          <Link href="/eval" className="hover:text-zinc-200">Eval</Link>
          <span className="text-zinc-700">·</span>
          <a
            href="https://github.com/damsolanke/aarogya-atlas"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-zinc-200"
          >
            <Code2 className="h-3 w-3" />
            Repo
          </a>
          <span className="text-zinc-700">·</span>
          <a
            href="https://dbc-12ce3b55-1ebb.cloud.databricks.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-zinc-200"
          >
            <ExternalLink className="h-3 w-3" />
            Databricks workspace
          </a>
        </nav>
      </div>
    </footer>
  );
}
