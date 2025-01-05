// 打轴设置

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface Callback<Args extends any[], Result = void> {
	onEmit?: (...args: Args) => Result;
}

const c = <Args extends any[], Result = void>(
	_onEmit: (...args: Args) => Result,
): Callback<Args, Result> => ({});

export const showTouchSyncPanelAtom = atomWithStorage("touchSyncPanel", false);
export const visualizeTimestampUpdateAtom = atomWithStorage(
	"visualizeTimestampUpdate",
	false,
);
export const syncTimeOffsetAtom = atomWithStorage("syncTimeOffset", 0);

export const currentEmptyBeatAtom = atom(0);

export const callbackSyncStartAtom = atom(c(() => {}));
export const callbackSyncNextAtom = atom(c(() => {}));
export const callbackSyncEndAtom = atom(c(() => {}));
