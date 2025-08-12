import {
    keyDeleteSelectionAtom,
	keyMoveNextLineAtom,
	keyMoveNextWordAtom,
	keyMovePrevLineAtom,
	keyMovePrevWordAtom,
	keyNewFileAtom,
	keyOpenAudioAtom,
	keyOpenFileAtom,
	keyPlaybackRateDownAtom,
	keyPlaybackRateUpAtom,
	keyPlayPauseAtom,
	keyRedoAtom,
	keySaveFileAtom,
	keySeekBackwardAtom,
	keySeekForwardAtom,
	keySelectAllAtom,
	keySelectInvertedAtom,
	keySelectWordsOfMatchedSelectionAtom,
	keySwitchEditModeAtom,
	keySwitchPreviewModeAtom,
	keySwitchSyncModeAtom,
	keySyncEndAtom,
	keySyncNextAtom,
	keySyncStartAtom,
	keyUndoAtom,
	keyVolumeDownAtom,
	keyVolumeUpAtom,
	type KeyBindingAtom,
} from "$/states/keybindings";
import { formatKeyBindings, recordShortcut } from "$/utils/keybindings";
import { Box, Grid, TextField } from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface KeyBindingsEntry {
	atom: KeyBindingAtom;
	label: string;
}

const kb = (thisAtom: KeyBindingAtom, label: string): KeyBindingsEntry => ({
	atom: thisAtom,
	label,
});

// ENTRIES built dynamically to allow i18n
const buildEntries = (t: (k: string, d?: string) => string): KeyBindingsEntry[] => [
	kb(keyNewFileAtom, t("keybindings.newFile", "New File")),
	kb(keyOpenFileAtom, t("keybindings.openFile", "Open File")),
	kb(keySaveFileAtom, t("keybindings.saveFile", "Save File")),
	kb(keyOpenAudioAtom, t("keybindings.openAudioFile", "Open Audio File")),
	kb(keyUndoAtom, t("keybindings.undo", "Undo")),
	kb(keyRedoAtom, t("keybindings.redo", "Redo")),
	kb(keySelectAllAtom, t("keybindings.selectAll", "Select All")),
	kb(keySelectInvertedAtom, t("keybindings.invertSelect", "Invert Selection")),
	kb(keySelectWordsOfMatchedSelectionAtom, t("keybindings.selectMatchedWords", "Select Matching Words")),
	kb(keyDeleteSelectionAtom, t("keybindings.deleteSelection", "Delete Selection")),
	kb(keySwitchEditModeAtom, t("keybindings.switchToEditMode", "Switch Mode - Edit Mode")),
	kb(keySwitchSyncModeAtom, t("keybindings.switchToSyncMode", "Switch Mode - Sync Mode")),
	kb(keySwitchPreviewModeAtom, t("keybindings.switchToPreviewMode", "Switch Mode - Preview Mode")),
	kb(keyMoveNextWordAtom, t("keybindings.syncMoveNextWord", "Sync - Move to Next Word")),
	kb(keyMovePrevWordAtom, t("keybindings.syncMovePrevWord", "Sync - Move to Previous Word")),
	kb(keyMoveNextLineAtom, t("keybindings.syncMoveNextLine", "Sync - Move to Next Line Start")),
	kb(keyMovePrevLineAtom, t("keybindings.syncMovePrevLine", "Sync - Move to Previous Line Start")),
	kb(keySyncStartAtom, t("keybindings.syncStart", "Sync - Start Axis")),
	kb(keySyncNextAtom, t("keybindings.syncStep", "Sync - Step Axis")),
	kb(keySyncEndAtom, t("keybindings.syncEnd", "Sync - End Axis")),
	kb(keyPlayPauseAtom, t("keybindings.playPause", "Playback - Play/Pause")),
	kb(keySeekForwardAtom, t("keybindings.seekForward5s", "Playback - Seek Forward 5s")),
	kb(keySeekBackwardAtom, t("keybindings.seekBackward5s", "Playback - Seek Backward 5s")),
	kb(keyVolumeUpAtom, t("keybindings.volumeUp", "Playback - Volume Up")),
	kb(keyVolumeDownAtom, t("keybindings.volumeDown", "Playback - Volume Down")),
	kb(keyPlaybackRateUpAtom, t("keybindings.speedUp", "Playback - Increase Speed")),
	kb(keyPlaybackRateDownAtom, t("keybindings.speedDown", "Playback - Decrease Speed")),
];

const KeyBindingsEdit = ({
	entry,
}: {
	entry: KeyBindingsEntry;
}) => {
	const [key, setKey] = useAtom(entry.atom);
	const [listening, setListening] = useState(false);
	const { t } = useTranslation();

	return (
		<>
			<Box>{entry.label}</Box>
			<Box>
				<TextField.Root
					onClick={async () => {
						try {
							setListening(true);
							const newKey = await recordShortcut();
							setKey(newKey);
						} catch {
						} finally {
							setListening(false);
						}
					}}
					size="1"
					value={listening ? t("keybindings.pressKeys", "Press keys...") : formatKeyBindings(key)}
					readOnly
				/>
			</Box>
		</>
	);
};

export const SettingsKeyBindingsDialog = () => {
	const { t } = useTranslation();
	// Wrap i18next t to allow (key, defaultValue)
	const tWithDefault = (key: string, def?: string) => t(key, def ? { defaultValue: def } : undefined);
	const entries = buildEntries(tWithDefault);
	return (
		<Grid columns="2" gapY="2">
			{entries.map((entry) => (
				<KeyBindingsEdit key={entry.label} entry={entry} />
			))}
		</Grid>
	);
};
