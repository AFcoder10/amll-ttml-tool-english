import { fetchLyricsDialogAtom, fetchLyricsProviderAtom } from "$/states/dialogs.ts";
import { lyricLinesAtom } from "$/states/main.ts";
import { Button, Dialog, Flex, RadioGroup, Text, TextField } from "@radix-ui/themes";
import { useAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { newLyricLine, newLyricWord, type LyricLine } from "$/utils/ttml-types.ts";
import { toast } from "react-toastify";

export const FetchLyricsDialog = () => {
  const [open, setOpen] = useAtom(fetchLyricsDialogAtom);
  const [provider, setProvider] = useAtom(fetchLyricsProviderAtom);
  const { t } = useTranslation();
  const store = useStore();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  type LRCLIBItem = {
    id: number;
    name: string;
    trackName?: string; // sometimes name vs trackName
    artistName: string;
    albumName?: string;
    duration?: number;
    syncedLyrics?: string | null;
    plainLyrics?: string | null;
  };

  const [results, setResults] = useState<LRCLIBItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "preview">("search");
  const [previewText, setPreviewText] = useState("");

  const canSearch = useMemo(() => provider === "lrclib" && title.trim().length > 0, [provider, title]);

  // Ensure only LRCLIB is active when opening the dialog in this fork
  useEffect(() => {
    if (open && provider !== "lrclib") {
      setProvider("lrclib");
    }
  }, [open, provider, setProvider]);

  const doSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const params = new URLSearchParams();
      params.set("track_name", title.trim());
      if (artist.trim()) params.set("artist_name", artist.trim());
      const url = `https://lrclib.net/api/search?${params.toString()}`;
      const resp = await fetch(url, { headers: { "accept": "application/json" } });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(t("fetchLyrics.searchFailed", { defaultValue: "Search failed: {{msg}}", msg }));
    } finally {
      setLoading(false);
    }
  }, [artist, canSearch, t, title]);

  const importResult = useCallback((item: LRCLIBItem) => {
    // Build plain text preview first
    let text = "";
    if (item.plainLyrics && item.plainLyrics.trim().length > 0) {
      text = item.plainLyrics;
    } else if (item.syncedLyrics && item.syncedLyrics.trim().length > 0) {
      // Strip LRC-style timestamps to recover the display text (preserve spaces)
      const lines = item.syncedLyrics.split(/\r?\n/);
      const cleaned = lines.map((ln) =>
        ln
          // Remove [mm:ss.xx] tags
          .replace(/\[[^\]]*\]/g, "")
          // Remove <mm:ss.xx> tags (word-level)
          .replace(/<[^>]*>/g, "")
          // Collapse multiple spaces
          .replace(/\s+/g, " ")
          .trim()
      );
      text = cleaned.join("\n");
    }
    if (!text.trim()) {
      toast.info(t("fetchLyrics.noContent", "No lyrics content found in this result."));
      return;
    }
    setPreviewText(text);
    setMode("preview");
  }, [t]);

  const addSpaces = useCallback(() => {
    const PLACEHOLDER = "__AMLL_ESC_SPACE__";
    const preserved = previewText.replace(/\\ \\/g, PLACEHOLDER);
    const replaced = preserved.replace(/ /g, "\\ \\");
    const restored = replaced.replace(new RegExp(PLACEHOLDER, "g"), "\\ \\");
    setPreviewText(restored);
  }, [previewText]);

  const importFromPreview = useCallback(() => {
    try {
      const lines: LyricLine[] = previewText.split(/\r?\n/).map((ln) => {
        // Split on a single backslash; patterns like "\ \" become ["word", " ", "next"]
        const parts = ln.split("\\");
        return {
          ...newLyricLine(),
          words: parts.map((p) => ({ ...newLyricWord(), word: p })),
        };
      });
      if (lines.length === 0) {
        toast.info(t("fetchLyrics.noContent", "No lyrics content found in this result."));
        return;
      }
      store.set(lyricLinesAtom, { lyricLines: lines, metadata: [] });
      setOpen(false);
      toast.success(t("fetchLyrics.imported", "Lyrics imported from LRCLIB"));
    } catch (e) {
      console.error(e);
      toast.error(t("fetchLyrics.importFailed", "Failed to import lyrics"));
    }
  }, [previewText, setOpen, store, t]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Content maxWidth="720px" maxHeight="90vh">
        {mode === "search" ? (
          <Flex direction="column" gap="3">
            <Flex align="center">
              <Dialog.Title style={{ flex: "1 1 auto" }}>
                {t("fetchLyrics.title", "Fetch Lyrics")}
              </Dialog.Title>
              <Button disabled={!canSearch || loading} onClick={doSearch}>
                {loading ? t("fetchLyrics.searching", "Searching...") : t("fetchLyrics.fetchBtn", "Fetch")}
              </Button>
            </Flex>

            <Flex direction="column" gap="2">
              <Text color="gray" size="2">{t("fetchLyrics.provider", "Provider")}</Text>
        <RadioGroup.Root value={provider} onValueChange={(v) => setProvider(v as "musixmatch" | "genius" | "lrclib") }>
                <Flex gap="3" wrap="wrap">
          <Flex align="center" gap="2"><RadioGroup.Item value="musixmatch" disabled /><Text color="gray">Musixmatch</Text></Flex>
          <Flex align="center" gap="2"><RadioGroup.Item value="genius" disabled /><Text color="gray">Genius</Text></Flex>
                  <Flex align="center" gap="2"><RadioGroup.Item value="lrclib" /><Text>LRCLIB</Text></Flex>
                </Flex>
              </RadioGroup.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Text color="gray" size="2">{t("fetchLyrics.fields.title", "Song Title")}</Text>
              <TextField.Root value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("fetchLyrics.placeholders.title", "Enter song title")} />
            </Flex>

            <Flex direction="column" gap="2">
              <Text color="gray" size="2">{t("fetchLyrics.fields.artist", "Artist")}</Text>
              <TextField.Root value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={t("fetchLyrics.placeholders.artist", "Enter artist name")} />
            </Flex>

            <Flex direction="column" gap="2">
              <Text color="gray" size="2">{t("fetchLyrics.results", "Results")}</Text>
              {!results && !error && !loading && (
                <Text color="gray" size="2">{t("fetchLyrics.resultsPlaceholder", "Results from provider will appear here.  ")}</Text>
              )}
              {error && (
                <Text color="red" size="2">{error}</Text>
              )}
              {results && results.length === 0 && (
                <Text color="gray" size="2">{t("fetchLyrics.noResults", "No results")}</Text>
              )}
              {results && results.length > 0 && (
                <Flex direction="column" gap="2">
                  {results.map((r) => (
                    <Flex key={r.id} align="center" justify="between" gap="3">
                      <Flex direction="column" style={{ flex: "1 1 auto" }}>
                        <Text size="3">{r.trackName ?? r.name} — {r.artistName}</Text>
                        {r.albumName && <Text color="gray" size="2">{r.albumName}</Text>}
                      </Flex>
                      <Button variant="soft" onClick={() => importResult(r)}>{t("fetchLyrics.import", "Import")}</Button>
                    </Flex>
                  ))}
                </Flex>
              )}
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Dialog.Title style={{ flex: "1 1 auto" }}>
                {t("fetchLyrics.previewTitle", "Preview & Edit")}
              </Dialog.Title>
              <Button variant="soft" onClick={() => setMode("search")}>{t("fetchLyrics.back", "Back")}</Button>
              <Button onClick={importFromPreview}>{t("importFromText.importBtn", "Import Lyrics")}</Button>
            </Flex>

            <Text color="gray" size="2">{t("fetchLyrics.previewHint", "You can edit the text below before importing. Use Add Spaces to convert spaces into word separators.")}</Text>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              style={{ height: "60vh", width: "100%", fontFamily: "var(--code-font-family)", background: "var(--color-panel-solid)", color: "var(--color-foreground)", borderRadius: 8, padding: 12, border: "1px solid var(--gray-a5)" }}
            />
            <Flex justify="end">
              <Button variant="soft" onClick={addSpaces}>{t("importFromText.addSpacesBtn", "Add Spaces")}</Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};
