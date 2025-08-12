import { ImportExportLyric } from "$/components/TopMenu/import-export-lyric.tsx";
import {
	confirmDialogAtom,
	historyRestoreDialogAtom,
	latencyTestDialogAtom,
	metadataEditorDialogAtom,
	settingsDialogAtom,
	submitToAMLLDBDialogAtom,
} from "$/states/dialogs.ts";
import {
	keyDeleteSelectionAtom,
	keyNewFileAtom,
	keyOpenFileAtom,
	keyRedoAtom,
	keySaveFileAtom,
	keySelectAllAtom,
	keySelectInvertedAtom,
	keySelectWordsOfMatchedSelectionAtom,
	keyUndoAtom,
} from "$/states/keybindings.ts";
import {
	isDirtyAtom,
	lyricLinesAtom,
	newLyricLinesAtom,
	redoLyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	undoLyricLinesAtom,
	undoableLyricLinesAtom,
} from "$/states/main.ts";
import { formatKeyBindings, useKeyBindingAtom } from "$/utils/keybindings.ts";
import { error, log } from "$/utils/logging.ts";
import { parseLyric } from "$/utils/ttml-parser.ts";
import { type LyricWord, newLyricWord } from "$/utils/ttml-types";
import exportTTMLText from "$/utils/ttml-writer.ts";
import { HomeRegular } from "@fluentui/react-icons";
import {
	Button,
	DropdownMenu,
	Flex,
	IconButton,
	TextField,
} from "@radix-ui/themes";
import { open } from "@tauri-apps/plugin-shell";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom, withImmer } from "jotai-immer";
import { Toolbar } from "radix-ui";
import { type FC, useCallback, useEffect, useState } from "react";
import { Trans } from "react-i18next";
import { toast } from "react-toastify";
import saveFile from "save-file";
import { useTranslation } from "react-i18next";

const useWindowSize = () => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});

	useEffect(() => {
		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowSize;
};

export const TopMenu: FC = () => {
	const { width } = useWindowSize();
	const showHomeButton = width < 800;
	const [saveFileName, setSaveFileName] = useAtom(saveFileNameAtom);
	const newLyricLine = useSetAtom(newLyricLinesAtom);
	const setLyricLines = useSetAtom(lyricLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const setMetadataEditorOpened = useSetAtom(metadataEditorDialogAtom);
	const setSettingsDialogOpened = useSetAtom(settingsDialogAtom);
	const undoLyricLines = useAtomValue(undoableLyricLinesAtom);
	const store = useStore();
	const { t, i18n } = useTranslation();
	const currentLanguage = i18n.language;
	const isDirty = useAtomValue(isDirtyAtom);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const setHistoryRestoreDialog = useSetAtom(historyRestoreDialogAtom);

	const onNewFile = useCallback(() => {
		const action = () => newLyricLine();
		if (isDirty) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.newFile.title"),
				description: t("confirmDialog.newFile.description"),
				onConfirm: action,
			});
		} else {
			action();
		}
	}, [isDirty, newLyricLine, setConfirmDialog, t]);

	const newFileKey = useKeyBindingAtom(keyNewFileAtom, onNewFile, [onNewFile]);

	const onOpenFile = useCallback(() => {
		const action = () => {
			const inputEl = document.createElement("input");
			inputEl.type = "file";
			inputEl.accept = ".ttml,*/*";
			inputEl.addEventListener(
				"change",
				async () => {
					const file = inputEl.files?.[0];
					if (!file) return;
					try {
						const ttmlText = await file.text();
						const ttmlData = parseLyric(ttmlText);
						setLyricLines(ttmlData);
						setSaveFileName(file.name);
					} catch (e) {
						error("Failed to parse TTML file", e);
					}
				},
				{
					once: true,
				},
			);
			inputEl.click();
		};

		if (isDirty) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.openFile.title"),
				description: t("confirmDialog.openFile.description"),
				onConfirm: action,
			});
		} else {
			action();
		}
	}, [isDirty, setLyricLines, setSaveFileName, setConfirmDialog, t]);

	const openFileKey = useKeyBindingAtom(keyOpenFileAtom, onOpenFile, [
		onOpenFile,
	]);

	const onOpenFileFromClipboard = useCallback(async () => {
		const action = async () => {
			try {
				const ttmlText = await navigator.clipboard.readText();
				const ttmlData = parseLyric(ttmlText);
				setLyricLines(ttmlData);
			} catch (e) {
				error("Failed to parse TTML file from clipboard", e);
			}
		};

		if (isDirty) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.openFromClipboard.title"),
				description: t("confirmDialog.openFromClipboard.description"),
				onConfirm: action,
			});
		} else {
			await action();
		}
	}, [isDirty, setLyricLines, setConfirmDialog, t]);

	const onSaveFile = useCallback(() => {
		try {
			const ttmlText = exportTTMLText(store.get(lyricLinesAtom));
			const b = new Blob([ttmlText], { type: "text/plain" });
			saveFile(b, saveFileName).catch(error);
		} catch (e) {
			error("Failed to save TTML file", e);
		}
	}, [saveFileName, store]);
	const saveFileKey = useKeyBindingAtom(keySaveFileAtom, onSaveFile, [
		onSaveFile,
	]);

	const onSaveFileToClipboard = useCallback(async () => {
		try {
			const lyric = store.get(lyricLinesAtom);
			const ttml = exportTTMLText(lyric);
			await navigator.clipboard.writeText(ttml);
		} catch (e) {
			error("Failed to save TTML file into clipboard", e);
		}
	}, [store]);

	const onSubmitToAMLLDB = useCallback(() => {
		store.set(submitToAMLLDBDialogAtom, true);
	}, [store]);

	const onOpenMetadataEditor = useCallback(() => {
		setMetadataEditorOpened(true);
	}, [setMetadataEditorOpened]);

	const onOpenSettings = useCallback(() => {
		setSettingsDialogOpened(true);
	}, [setSettingsDialogOpened]);

	const onOpenLatencyTest = useCallback(() => {
		store.set(latencyTestDialogAtom, true);
	}, [store]);

	const onOpenGitHub = useCallback(async () => {
		if (import.meta.env.TAURI_ENV_PLATFORM) {
			await open("https://github.com/Steve-xmh/amll-ttml-tool");
		} else {
			window.open("https://github.com/Steve-xmh/amll-ttml-tool");
		}
	}, []);

	const onOpenWiki = useCallback(async () => {
		if (import.meta.env.TAURI_ENV_PLATFORM) {
			await open("https://github.com/Steve-xmh/amll-ttml-tool/wiki");
		} else {
			window.open("https://github.com/Steve-xmh/amll-ttml-tool/wiki");
		}
	}, []);

	const onUndo = useCallback(() => {
		store.set(undoLyricLinesAtom);
	}, [store]);
	const undoKey = useKeyBindingAtom(keyUndoAtom, onUndo, [onUndo]);

	const onRedo = useCallback(() => {
		store.set(redoLyricLinesAtom);
	}, [store]);
	const redoKey = useKeyBindingAtom(keyRedoAtom, onRedo, [onRedo]);

	const onUnselectAll = useCallback(() => {
		const immerSelectedLinesAtom = withImmer(selectedLinesAtom);
		const immerSelectedWordsAtom = withImmer(selectedWordsAtom);
		store.set(immerSelectedLinesAtom, (old) => {
			old.clear();
		});
		store.set(immerSelectedWordsAtom, (old) => {
			old.clear();
		});
	}, [store]);
	const unselectAllLinesKey = useKeyBindingAtom(
		keySelectAllAtom,
		onUnselectAll,
		[onUnselectAll],
	);

	const onSelectAll = useCallback(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const selectedLineIds = store.get(selectedLinesAtom);
		const selectedLines = lines.filter((l) => selectedLineIds.has(l.id));
		const selectedWordIds = store.get(selectedWordsAtom);
		const selectedWords = lines
			.flatMap((l) => l.words)
			.filter((w) => selectedWordIds.has(w.id));
		if (selectedWords.length > 0) {
			const tmpWordIds = new Set(selectedWordIds);
			for (const selLine of selectedLines) {
				for (const word of selLine.words) {
					tmpWordIds.delete(word.id);
				}
			}
			if (tmpWordIds.size === 0) {
				// 选中所有单词
				store.set(
					selectedWordsAtom,
					new Set(selectedLines.flatMap((line) => line.words.map((w) => w.id))),
				);
				return;
			}
		} else {
			// 选中所有歌词行
			store.set(
				selectedLinesAtom,
				new Set(store.get(lyricLinesAtom).lyricLines.map((l) => l.id)),
			);
		}
		const sel = window.getSelection();
		if (sel) {
			if (sel.empty) {
				// Chrome
				sel.empty();
			} else if (sel.removeAllRanges) {
				// Firefox
				sel.removeAllRanges();
			}
		}
	}, [store]);
	const selectAllLinesKey = useKeyBindingAtom(keySelectAllAtom, onSelectAll, [
		onSelectAll,
	]);

	const onSelectInverted = useCallback(() => {}, []);
	const selectInvertedLinesKey = useKeyBindingAtom(
		keySelectInvertedAtom,
		onSelectInverted,
		[onSelectInverted],
	);

	const onSelectWordsOfMatchedSelection = useCallback(() => {}, []);
	const selectWordsOfMatchedSelectionKey = useKeyBindingAtom(
		keySelectWordsOfMatchedSelectionAtom,
		onSelectWordsOfMatchedSelection,
		[onSelectWordsOfMatchedSelection],
	);

	const onDeleteSelection = useCallback(() => {
		const selectedWordIds = store.get(selectedWordsAtom);
		const selectedLineIds = store.get(selectedLinesAtom);
		log("deleting selections", selectedWordIds, selectedLineIds);
		if (selectedWordIds.size === 0) {
			// 删除选中的行
			editLyricLines((prev) => {
				prev.lyricLines = prev.lyricLines.filter(
					(l) => !selectedLineIds.has(l.id),
				);
			});
		} else {
			// 删除选中的单词
			editLyricLines((prev) => {
				for (const line of prev.lyricLines) {
					line.words = line.words.filter((w) => !selectedWordIds.has(w.id));
				}
			});
		}
		store.set(selectedWordsAtom, new Set());
		store.set(selectedLinesAtom, new Set());
	}, [store, editLyricLines]);
	const deleteSelectionKey = useKeyBindingAtom(
		keyDeleteSelectionAtom,
		onDeleteSelection,
		[onDeleteSelection],
	);

	const onSimpleSegmentation = useCallback(() => {
		editLyricLines((state) => {
			const latinReg = /^[0-9A-z\u00C0-\u00ff'.,-\/#!$%^&*;:{}=\-_`~()]+$/;

			for (const line of state.lyricLines) {
				const chars = line.words.flatMap((w) => w.word.split(""));
				const wordsResult: LyricWord[] = [];
				let tmpWord = newLyricWord();
				for (const c of chars) {
					if (/^\s+$/.test(c)) {
						if (tmpWord.word.trim().length > 0) {
							wordsResult.push(tmpWord);
						}
						tmpWord = {
							...newLyricWord(),
							word: " ",
						};
					} else if (latinReg.test(c)) {
						if (latinReg.test(tmpWord.word)) {
							tmpWord.word += c;
						} else {
							if (tmpWord.word.length > 0) {
								wordsResult.push(tmpWord);
							}
							tmpWord = {
								...newLyricWord(),
								word: c,
							};
						}
					} else {
						if (tmpWord.word.length > 0) {
							wordsResult.push(tmpWord);
						}
						tmpWord = {
							...newLyricWord(),
							word: c,
						};
					}
				}
				if (tmpWord.word.length > 0) {
					wordsResult.push(tmpWord);
				}
				line.words = wordsResult;
			}
		});
	}, [editLyricLines]);

	const onJiebaSegmentation = useCallback(async () => {
		const id = toast(
									t("topBar.menu.tools.loadingJieba", "Loading Jieba segmentation module..."),
			{
				autoClose: false,
				isLoading: true,
			},
		);
		try {
			const { default: wasmMoudle } = await import(
				"$/assets/jieba_rs_wasm_bg.wasm?url"
			);
			const { default: init, cut } = await import("jieba-wasm");
			await init({
				module_or_path: wasmMoudle,
			});
			toast.update(id, {
					render: t("topBar.menu.tools.processing", "Segmenting lyrics, please wait..."),
			});
			editLyricLines((state) => {
				for (const line of state.lyricLines) {
					const mergedWords = line.words.map((w) => w.word).join("");
					const splited = cut(mergedWords, true);
					line.words = [];
					for (const word of splited) {
						line.words.push({
							...newLyricWord(),
							word: word,
						});
					}
				}
			});
			toast.update(id, {
				render: t("topBar.menu.tools.completed", "Segmentation completed!"),
				type: "success",
				isLoading: false,
				autoClose: 5000,
			});
		} catch (err) {
			toast.update(id, {
				render: t(
					"topBar.menu.tools.error",
					t("topBar.menu.tools.failed", "Segmentation failed, please check console output!"),
				),
				type: "error",
				isLoading: false,
				autoClose: 5000,
			});
			error(err);
		}
	}, [editLyricLines]);

	return (
		<Flex
			p="2"
			pr="0"
			align="center"
			gap="2"
			style={{
				whiteSpace: "nowrap",
			}}
		>
			{showHomeButton ? (
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<IconButton variant="soft">
							<HomeRegular />
						</IconButton>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								{t("topBar.menu.language", "语言")}
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.RadioGroup value={currentLanguage} onValueChange={(v) => import("$/i18n").then(m => m.setAppLanguage(v))}>
									<DropdownMenu.RadioItem value="en-US">
										{t("topBar.menu.languageEnglish", "英语")}
									</DropdownMenu.RadioItem>
									<DropdownMenu.RadioItem value="zh-CN">
										{t("topBar.menu.languageChinese", "简体中文")}
									</DropdownMenu.RadioItem>
								</DropdownMenu.RadioGroup>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<DropdownMenu.Separator />
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Trans i18nKey="topBar.menu.file">File</Trans>
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item
									onSelect={onNewFile}
									shortcut={formatKeyBindings(newFileKey)}
								>
									<Trans i18nKey="topBar.menu.newLyric">New TTML File</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onOpenFile}
									shortcut={formatKeyBindings(openFileKey)}
								>
									<Trans i18nKey="topBar.menu.openLyric">Open TTML File</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={onOpenFileFromClipboard}>
									<Trans i18nKey="topBar.menu.openFromClipboard">
										Open TTML File from Clipboard
									</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onSaveFile}
									shortcut={formatKeyBindings(saveFileKey)}
								>
									<Trans i18nKey="topBar.menu.saveLyric">Save TTML File</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onSelect={() => setHistoryRestoreDialog(true)}
								>
									<Trans i18nKey="topBar.menu.restoreFromHistory">Restore from History...</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onSaveFileToClipboard}>
									<Trans i18nKey="topBar.menu.saveLyricToClipboard">Save TTML File to Clipboard</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<ImportExportLyric />
								<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onSubmitToAMLLDB}>
									<Trans i18nKey="topBar.menu.uploadToAMLLDB">Upload to AMLL Lyrics Database</Trans>
								</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Trans i18nKey="topBar.menu.edit">Edit</Trans>
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item
									onSelect={onUndo}
									shortcut={formatKeyBindings(undoKey)}
									disabled={undoLyricLines.canUndo}
								>
									<Trans i18nKey="topBar.menu.undo">Undo</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onRedo}
									shortcut={formatKeyBindings(redoKey)}
									disabled={undoLyricLines.canRedo}
								>
									<Trans i18nKey="topBar.menu.redo">Redo</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onSelect={onSelectAll}
									shortcut={formatKeyBindings(selectAllLinesKey)}
								>
									<Trans i18nKey="topBar.menu.selectAllLines">Select All Lyric Lines</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onUnselectAll}
									shortcut={formatKeyBindings(unselectAllLinesKey)}
								>
									<Trans i18nKey="topBar.menu.unselectAllLines">Unselect All Lyric Lines</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onSelectInverted}
									shortcut={formatKeyBindings(selectInvertedLinesKey)}
								>
									<Trans i18nKey="topBar.menu.invertSelectAllLines">Invert Selection of Lyric Lines</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onSelect={onSelectWordsOfMatchedSelection}
									shortcut={formatKeyBindings(selectWordsOfMatchedSelectionKey)}
								>
									<Trans i18nKey="topBar.menu.selectWordsOfMatchedSelection">Select Matching Words</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onSelect={onDeleteSelection}
									shortcut={formatKeyBindings(deleteSelectionKey)}
								>
									<Trans i18nKey="contextMenu.deleteWord">Delete Selected Word</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onOpenMetadataEditor}>
									<Trans i18nKey="topBar.menu.editMetadata">Edit Lyric Metadata</Trans>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onOpenSettings}>
									<Trans i18nKey="settingsDialog.title">Settings</Trans>
								</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Trans i18nKey="topBar.menu.tool">Tools</Trans>
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger>
										<Trans i18nKey="topBar.menu.splitWordBySimpleMethod">Segment Lines (Simple)</Trans>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<DropdownMenu.Item onSelect={onJiebaSegmentation}>
											<Trans i18nKey="topBar.menu.splitWordByJieba">Segment Lines (Jieba)</Trans>
										</DropdownMenu.Item>
										<DropdownMenu.Item onSelect={onSimpleSegmentation}>
											<Trans i18nKey="topBar.menu.splitWordBySimpleMethod">Segment Lines (Simple)</Trans>
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
								<DropdownMenu.Item onSelect={onOpenLatencyTest}>
									<Trans i18nKey="settingsDialog.common.latencyTest">Audio/Input Latency Test</Trans>
								</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Trans i18nKey="topBar.menu.help">Help</Trans>
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item onSelect={onOpenGitHub}>
									GitHub
								</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={onOpenWiki}>
									使用说明
								</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			) : (
				<Toolbar.Root>
					<DropdownMenu.Root>
						<Toolbar.Button asChild>
							<DropdownMenu.Trigger>
								<Button
									variant="soft"
									style={{
										borderTopRightRadius: "0",
										borderBottomRightRadius: "0",
										marginRight: "0px",
									}}
								>
									<Trans i18nKey="topBar.menu.file">File</Trans>
								</Button>
							</DropdownMenu.Trigger>
						</Toolbar.Button>
						<DropdownMenu.Content>
							<DropdownMenu.Item
								onSelect={onNewFile}
								shortcut={formatKeyBindings(newFileKey)}
							>
								<Trans i18nKey="topBar.menu.newLyric">New TTML File</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onOpenFile}
								shortcut={formatKeyBindings(openFileKey)}
							>
								<Trans i18nKey="topBar.menu.openLyric">Open TTML File</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={onOpenFileFromClipboard}>
								<Trans i18nKey="topBar.menu.openFromClipboard">Open TTML File from Clipboard</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onSaveFile}
								shortcut={formatKeyBindings(saveFileKey)}
							>
								<Trans i18nKey="topBar.menu.saveLyric">Save TTML File</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={() => setHistoryRestoreDialog(true)}>
								<Trans i18nKey="topBar.menu.restoreFromHistory">Restore from History...</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={onSaveFileToClipboard}>
								<Trans i18nKey="topBar.menu.saveLyricToClipboard">Save TTML File to Clipboard</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<ImportExportLyric />
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={onSubmitToAMLLDB}>
								<Trans i18nKey="topBar.menu.uploadToAMLLDB">Upload to AMLL Lyrics Database</Trans>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<DropdownMenu.Root>
						<Toolbar.Button asChild>
							<DropdownMenu.Trigger
								style={{
									borderRadius: "0",
									marginRight: "0px",
								}}
							>
								<Button variant="soft">
									<Trans i18nKey="topBar.menu.edit">Edit</Trans>
								</Button>
							</DropdownMenu.Trigger>
						</Toolbar.Button>
						<DropdownMenu.Content>
							<DropdownMenu.Item
								onSelect={onUndo}
								shortcut={formatKeyBindings(undoKey)}
								disabled={undoLyricLines.canUndo}
							>
									<Trans i18nKey="topBar.menu.undo">Undo</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onRedo}
								shortcut={formatKeyBindings(redoKey)}
								disabled={undoLyricLines.canRedo}
							>
									<Trans i18nKey="topBar.menu.redo">Redo</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onSelect={onSelectAll}
								shortcut={formatKeyBindings(selectAllLinesKey)}
							>
									<Trans i18nKey="topBar.menu.selectAllLines">Select All Lyric Lines</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onUnselectAll}
								shortcut={formatKeyBindings(unselectAllLinesKey)}
							>
									<Trans i18nKey="topBar.menu.unselectAllLines">Unselect All Lyric Lines</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onSelectInverted}
								shortcut={formatKeyBindings(selectInvertedLinesKey)}
							>
									<Trans i18nKey="topBar.menu.invertSelectAllLines">Invert Selection of Lyric Lines</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={onSelectWordsOfMatchedSelection}
								shortcut={formatKeyBindings(selectWordsOfMatchedSelectionKey)}
							>
									<Trans i18nKey="topBar.menu.selectWordsOfMatchedSelection">Select Matching Words</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onSelect={onDeleteSelection}
								shortcut={formatKeyBindings(deleteSelectionKey)}
							>
									<Trans i18nKey="contextMenu.deleteWord">Delete Selected Word</Trans>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onOpenMetadataEditor}>
									<Trans i18nKey="topBar.menu.editMetadata">Edit Lyric Metadata</Trans>
								</DropdownMenu.Item>
							<DropdownMenu.Separator />
								<DropdownMenu.Item onSelect={onOpenSettings}>
									<Trans i18nKey="settingsDialog.title">Settings</Trans>
								</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<DropdownMenu.Root>
						<Toolbar.Button asChild>
							<DropdownMenu.Trigger>
								<Button
									variant="soft"
									style={{
										borderRadius: "0",
										marginRight: "0px",
									}}
								>
									{t("topBar.menu.tool", "Tools")}
								</Button>
							</DropdownMenu.Trigger>
						</Toolbar.Button>
						<DropdownMenu.Content>
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger>
									{t(
										"topBar.menu.splitWordBySimpleMethod",
										"Segment Lines (Simple)",
									)}
								</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent>
									<DropdownMenu.Item onSelect={onJiebaSegmentation}>
										{t(
											"topBar.menu.splitWordByJieba",
											"Segment Lines (Jieba)",
										)}
									</DropdownMenu.Item>
									<DropdownMenu.Item onSelect={onSimpleSegmentation}>
										{t(
											"topBar.menu.splitWordBySimpleMethod",
											"Segment Lines (Simple)",
										)}
									</DropdownMenu.Item>
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
							<DropdownMenu.Item onSelect={onOpenLatencyTest}>
								{t("settingsDialog.common.latencyTest", "Audio/Input Latency Test")}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<DropdownMenu.Root>
						<Toolbar.Button asChild>
							<DropdownMenu.Trigger>
								<Button
									variant="soft"
									style={{
										borderTopLeftRadius: "0",
										borderBottomLeftRadius: "0",
									}}
								>
									<Trans i18nKey="topBar.menu.help">Help</Trans>
								</Button>
							</DropdownMenu.Trigger>
						</Toolbar.Button>
						<DropdownMenu.Content>
							<DropdownMenu.Item onSelect={onOpenGitHub}>
								GitHub
							</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={onOpenWiki}>
								<Trans i18nKey="topBar.menu.openWiki">Guide</Trans>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Toolbar.Root>
			)}
			<TextField.Root
				style={{
					flexBasis: "20em",
				}}
				mr="2"
					placeholder={t("topBar.fileNamePlaceholder", "File Name")}
				value={saveFileName}
				onChange={(e) => {
					setSaveFileName(e.target.value);
				}}
			/>
		</Flex>
	);
};
