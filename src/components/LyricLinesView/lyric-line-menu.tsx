import { lyricLinesAtom, selectedLinesAtom } from "$/states/main";
import { ContextMenu } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { atom, useAtomValue } from "jotai";
import { useSetImmerAtom } from "jotai-immer";

const selectedLinesSizeAtom = atom((get) => get(selectedLinesAtom).size);

export const LyricLineMenu = ({
	lineIndex,
}: {
	lineIndex: number;
}) => {
	const selectedLinesSize = useAtomValue(selectedLinesSizeAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const { t } = useTranslation();

	return (
		<>
			<ContextMenu.Item
				onClick={() => {
					editLyricLines((state) => {
						if (selectedLinesSize === 0) {
							state.lyricLines.splice(lineIndex, 1);
						} else {
							state.lyricLines = state.lyricLines.filter(
								(line) => !selectedLines.has(line.id),
							);
						}
					});
				}}
			>
				{t("lyricLineMenu.deleteSelectedLines", "删除所选歌词行")}
			</ContextMenu.Item>
		</>
	);
};
