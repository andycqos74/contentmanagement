"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewsItem, NewsSettings } from "@/lib/widgets/registry";
import { formatDate, truncate } from "@/lib/widgets/format";

function Card({ item, s }: { item: NewsItem; s: NewsSettings }) {
  const style =
    s.cardStyle === "shadow"
      ? "shadow-md hover:shadow-lg"
      : s.cardStyle === "border"
        ? "border border-slate-200"
        : "";
  const inner = (
    <>
      {s.showImage && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-xs">
          {s.showCategory && item.category && (
            <span
              className="rounded-full px-2 py-0.5 font-medium text-white"
              style={{ background: s.accentColor }}
            >
              {item.category}
            </span>
          )}
          {s.showDate && item.date && (
            <span className="text-slate-500">
              {formatDate(item.date, s.dateFormat)}
            </span>
          )}
        </div>
        <h3 className="font-semibold leading-snug text-slate-900">{item.title}</h3>
        {s.showExcerpt && item.excerpt && (
          <p className="mt-2 text-sm text-slate-600">
            {truncate(item.excerpt, s.excerptLength)}
          </p>
        )}
        {item.url && s.readMoreText && (
          <span
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: s.accentColor }}
          >
            {s.readMoreText} →
          </span>
        )}
      </div>
    </>
  );
  const cls = `group block overflow-hidden rounded-lg bg-white ${style}`;
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function LatestNews({
  settings,
  items,
}: {
  settings: NewsSettings;
  items: NewsItem[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const list = items.slice(0, settings.limit);

  if (list.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-slate-400">
        No articles yet
      </div>
    );
  }

  if (settings.layout === "list") {
    return (
      <div className="flex flex-col gap-4">
        {list.map((item, i) => (
          <div key={i} className="[&>*]:flex [&>*]:gap-4">
            <div>
              {settings.showImage && (
                <div className="hidden h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              )}
              <div className="flex-1">
                <Card item={item} s={{ ...settings, showImage: false }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (settings.layout === "carousel") {
    return (
      <div className="relative">
        <div
          ref={scroller}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((item, i) => (
            <div key={i} className="w-72 shrink-0 snap-start">
              <Card item={item} s={settings} />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scroller.current?.scrollBy({ left: -320, behavior: "smooth" })}
              className="absolute -left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scroller.current?.scrollBy({ left: 320, behavior: "smooth" })}
              className="absolute -right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    );
  }

  // grid (default) — responsive via flex-basis + min width, no media queries needed
  return (
    <div className="flex flex-wrap gap-4">
      {list.map((item, i) => (
        <div
          key={i}
          style={{
            flex: `1 1 calc(${100 / settings.columns}% - 1rem)`,
            minWidth: 220,
          }}
        >
          <Card item={item} s={settings} />
        </div>
      ))}
    </div>
  );
}
