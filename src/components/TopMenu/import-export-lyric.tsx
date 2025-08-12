import { importFromTextDialogAtom } from "$/states/dialogs.ts";
import { lyricLinesAtom, saveFileNameAtom } from "$/states/main.ts";
import { error } from "$/utils/logging.ts";
import {
	type LyricLine,
	parseEslrc,
	parseLrc,
	parseLys,
	parseQrc,
	parseYrc,
	stringifyAss,
	stringifyEslrc,
	stringifyLrc,
	stringifyLys,
	stringifyQrc,
	stringifyYrc,
} from "@applemusic-like-lyrics/lyric";
import { DropdownMenu } from "@radix-ui/themes";
import { Trans } from "react-i18next";
import { useSetAtom, useStore } from "jotai";
import saveFile from "save-file";
import { uid } from "uid";

export const ImportExportLyric = () => {
	const store = useStore();
	const onImportLyric =
		(parser: (lyric: string) => LyricLine[], extension: string) => () => {
			const inputEl = document.createElement("input");
			inputEl.type = "file";
			inputEl.accept = `.${extension},*/*`;
			inputEl.addEventListener(
				"change",
				async () => {
					const file = inputEl.files?.[0];
					if (!file) return;
					try {
						const lyricText = await file.text();
						const lyricLines = parser(lyricText);
						store.set(lyricLinesAtom, {
							lyricLines: lyricLines.map((line) => ({
								...line,
								words: line.words.map((word) => ({
									...word,
									id: uid(),
									obscene: false,
									emptyBeat: 0,
								})),
								ignoreSync: false,
								id: uid(),
							})),
							metadata: [],
						});
					} catch (e) {
						error(`Failed to import lyric with format "${extension}"`, e);
					}
				},
				{
					once: true,
				},
			);
			inputEl.click();
		};
	const onExportLyric =
		(stringifier: (lines: LyricLine[]) => string, extension: string) =>
		async () => {
			const lyric = store.get(lyricLinesAtom).lyricLines;
			const saveFileName = store.get(saveFileNameAtom);
			const baseName = saveFileName.replace(/\.[^.]*$/, "");
			const fileName = `${baseName}.${extension}`;
			try {
				const data = stringifier(lyric);
				const b = new Blob([data], { type: "text/plain" });
				await saveFile(b, fileName);
			} catch (e) {
				error(`Failed to export lyric with format "${extension}"`, e);
			}
		};
	const setImportFromTextDialog = useSetAtom(importFromTextDialogAtom);

	return (
		<>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.importLyric">导入歌词...</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onClick={() => setImportFromTextDialog(true)}>
						<Trans i18nKey="topBar.menu.importLyricFromText">从纯文本导入</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onImportLyric(parseLrc, "lrc")}>
						<Trans i18nKey="topBar.menu.importLyricFromLrc">从 LyRiC 文件导入</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onImportLyric(parseEslrc, "lrc")}>
						<Trans i18nKey="topBar.menu.importLyricFromEslrc">从 ESLyRiC 文件导入</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onImportLyric(parseQrc, "qrc")}>
						<Trans i18nKey="topBar.menu.importLyricFromQrc">从 QRC 文件导入</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onImportLyric(parseYrc, "yrc")}>
						<Trans i18nKey="topBar.menu.importLyricFromYrc">从 YRC 文件导入</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onImportLyric(parseLys, "lys")}>
						<Trans i18nKey="topBar.menu.importLyricFromLys">从 Lyricify Syllable 文件导入</Trans>
					</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.exportLyric">导出歌词...</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onClick={onExportLyric(stringifyLrc, "lrc")}>
						<Trans i18nKey="topBar.menu.exportLyricToLrc">导出到 LyRiC</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyEslrc, "lrc")}>
						<Trans i18nKey="topBar.menu.exportLyricToEslrc">导出到 ESLyRiC</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyQrc, "qrc")}>
						<Trans i18nKey="topBar.menu.exportLyricToQrc">导出到 QRC</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyYrc, "yrc")}>
						<Trans i18nKey="topBar.menu.exportLyricToYrc">导出到 YRC</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyLys, "lys")}>
						<Trans i18nKey="topBar.menu.exportLyricToLys">导出到 Lyricify Syllable</Trans>
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyAss, "ass")}>
						<Trans i18nKey="topBar.menu.exportLyricToAss">导出到 ASS 字幕</Trans>
					</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		</>
	);
};
