import Image from "next/image";
import { motion } from "framer-motion";
import { RelatedItem } from "../../types/media";

interface RelatedCarouselProps {
  items: RelatedItem[];
  loading: boolean;
}

export function RelatedCarousel({ items, loading }: RelatedCarouselProps) {
  if (!loading && items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="mt-4"
    >
      <p className="text-gray-400 text-sm mb-2">More Like This</p>
      <div className="flex gap-3 overflow-x-auto py-1 snap-x snap-mandatory scrollbar-hide">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-20 snap-start">
                <div className="aspect-[2/3] rounded-md bg-gray-800 animate-pulse" />
                <div className="mt-1.5 h-2.5 bg-gray-800 rounded animate-pulse mx-1" />
              </div>
            ))
          : items.map((item) => (
              <a
                key={item.id}
                href={`https://www.imdb.com/find?q=${encodeURIComponent(
                  item.title + (item.year ? ` ${item.year}` : ""),
                )}&s=tt`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-28 snap-start group"
              >
                <div className="aspect-[2/3] rounded-md overflow-hidden bg-gray-800 relative ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all">
                  {item.thumb ? (
                    <Image
                      src={item.thumb}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-1 text-gray-500 text-[10px] text-center leading-tight">
                      {item.title}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-center truncate px-0.5 group-hover:text-[var(--accent)] transition-colors leading-tight">
                  {item.title}
                </p>
                {item.year && (
                  <p className="text-[10px] text-center text-gray-500">
                    {item.year}
                  </p>
                )}
              </a>
            ))}
      </div>
    </motion.div>
  );
}
