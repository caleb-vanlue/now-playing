import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown } from "react-icons/hi";

const PREVIEW_LINES = 4;

interface LyricsPanelProps {
  lyrics: string | null;
  instrumental: boolean;
  loading: boolean;
}

export function LyricsPanel({ lyrics, instrumental, loading }: LyricsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!loading && !lyrics && !instrumental) return null;

  const lines = lyrics ? lyrics.split("\n") : [];
  const hasMore = lines.length > PREVIEW_LINES;
  const visible = expanded ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-gray-400 text-sm">Lyrics</p>
        {loading && (
          <span className="w-3 h-3 rounded-full border border-gray-600 border-t-gray-300 animate-spin" />
        )}
      </div>

      {!loading && (
        <>
          {instrumental ? (
            <p className="text-gray-500 text-sm italic">Instrumental</p>
          ) : (
            <>
              <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                {visible.join("\n")}
              </p>

              {hasMore && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-[var(--accent)] transition-colors py-1"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={expanded ? "less" : "more"}
                      initial={{ opacity: 0, y: expanded ? 4 : -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: expanded ? -4 : 4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {expanded ? "show less" : "show more"}
                    </motion.span>
                  </AnimatePresence>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    <HiChevronDown size={13} />
                  </motion.span>
                </button>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
