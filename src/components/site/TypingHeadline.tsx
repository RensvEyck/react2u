"use client";
import { useEffect, useState } from "react";

export default function TypingHeadline({ before, words, after }: { before: string; words: string[]; after: string }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const word = words[wordIdx % words.length] || "";

  useEffect(() => {
    let delay = deleting ? 40 : 90;
    if (!deleting && chars === word.length) delay = 2500;
    if (deleting && chars === 0) delay = 300;
    const t = setTimeout(() => {
      if (!deleting && chars === word.length) setDeleting(true);
      else if (deleting && chars === 0) {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      } else setChars((c) => c + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(t);
  }, [chars, deleting, word, words.length]);

  return (
    <h3 className="text-3xl md:text-4xl text-center">
      {before} <span className="typing-word">{word.slice(0, chars)}</span> {after}
    </h3>
  );
}
