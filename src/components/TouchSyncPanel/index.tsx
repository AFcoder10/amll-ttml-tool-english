import {
	keySyncEndAtom,
	keySyncNextAtom,
	keySyncStartAtom,
} from "$/states/keybindings.ts";
import { forceInvokeKeyBindingAtom } from "$/utils/keybindings.ts";
import { Button, Card, Grid } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useStore } from "jotai";
import type { FC } from "react";
import styles from "./index.module.css";

export const TouchSyncPanel: FC = () => {
	const store = useStore();
	const { t } = useTranslation();
	return (
		<Card m="2" mt="0" style={{ flexShrink: "0" }}>
			<Grid rows="2" columns="3" gap="2" className={styles.syncButtons}>
				<Button variant="soft" size="4">{t("touchSyncPanel.jumpPrevWord", "跳上词")}</Button>
				<Button variant="soft" size="4">{t("touchSyncPanel.jumpCurWord", "跳本词")}</Button>
				<Button variant="soft" size="4">{t("touchSyncPanel.jumpNextWord", "跳下词")}</Button>
				<Button
					variant="soft"
					size="4"
					onMouseDown={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncStartAtom, evt.nativeEvent)
					}
					onTouchStart={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncStartAtom, evt.nativeEvent)
					}
				>
					{t("touchSyncPanel.startAxis", "起始轴")}
				</Button>
				<Button
					variant="soft"
					size="4"
					onClick={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncNextAtom, evt.nativeEvent)
					}
					onTouchStart={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncNextAtom, evt.nativeEvent)
					}
				>
					{t("touchSyncPanel.continuousAxis", "连续轴")}
				</Button>
				<Button
					variant="soft"
					size="4"
					onMouseDown={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncEndAtom, evt.nativeEvent)
					}
					onTouchStart={(evt) =>
						forceInvokeKeyBindingAtom(store, keySyncEndAtom, evt.nativeEvent)
					}
				>
					{t("touchSyncPanel.endAxis", "结束轴")}
				</Button>
			</Grid>
		</Card>
	);
};
