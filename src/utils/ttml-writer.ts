/*
 * Copyright 2023-2025 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/Steve-xmh/amll-ttml-tool/blob/main/LICENSE
 */

/**
 * @fileoverview
 * 用于将内部歌词数组对象导出成 TTML 格式的模块
 * 但是可能会有信息会丢失
 */

import { log } from "./logging.ts";
import i18n from "$/i18n";
import { msToTimestamp as origMsToTimestamp } from "./timestamp";
import type { LyricLine, LyricWord, TTMLLyric } from "./ttml-types";

const msToTimestamp = (time: number) => origMsToTimestamp(time, true);

export default function exportTTMLText(
	ttmlLyric: TTMLLyric,
	pretty = false,
): string {
	const params: LyricLine[][] = [];
	const lyric = ttmlLyric.lyricLines;

	let tmp: LyricLine[] = [];
	for (const line of lyric) {
		if (line.words.length === 0 && tmp.length > 0) {
			params.push(tmp);
			tmp = [];
		} else {
			tmp.push(line);
		}
	}

	if (tmp.length > 0) {
		params.push(tmp);
	}

	const doc = new Document();

	function createWordElement(word: LyricWord): Element {
		const span = doc.createElement("span");
		span.setAttribute("begin", msToTimestamp(word.startTime));
		span.setAttribute("end", msToTimestamp(word.endTime));
		if (word.obscene) span.setAttribute("amll:obscene", "true");
		if (word.emptyBeat)
			span.setAttribute("amll:empty-beat", `${word.emptyBeat}`);
		span.appendChild(doc.createTextNode(word.word));
		return span;
	}

	const ttRoot = doc.createElement("tt");

	ttRoot.setAttribute("xmlns", "http://www.w3.org/ns/ttml");
	ttRoot.setAttribute("xmlns:ttm", "http://www.w3.org/ns/ttml#metadata");
	ttRoot.setAttribute("xmlns:amll", "http://www.example.com/ns/amll");
	ttRoot.setAttribute(
		"xmlns:itunes",
		"http://music.apple.com/lyric-ttml-internal",
	);

	// Derive timing & language attributes
	// 1. itunes:timing: Word | Line | None
	//    Word  -> at least one line has 2+ non-blank words (dynamic / per-word timing)
	//    Line  -> has lyric lines & words, but every line has 0 or 1 non-blank word w/ timing
	//    None  -> no timed words at all (empty lyric or no non-blank words with timing data)
	const nonBlankWordCountsPerLine = lyric.map((l) =>
		l.words.filter((w) => w.word.trim().length > 0).length,
	);
	const totalNonBlankWords = nonBlankWordCountsPerLine.reduce(
		(sum, v) => sum + v,
		0,
	);
	const hasAnyTiming = lyric.some((l) =>
		l.words.some((w) => w.word.trim().length > 0 && w.endTime > w.startTime),
	);
	let timingMode: "Word" | "Line" | "None";
	if (totalNonBlankWords === 0 || !hasAnyTiming) timingMode = "None";
	else if (nonBlankWordCountsPerLine.some((c) => c > 1)) timingMode = "Word";
	else timingMode = "Line";
	ttRoot.setAttribute("itunes:timing", timingMode);

	// 2. xml:lang: prefer metadata key "language" (first value) else current app language -> ISO 639-1
	const languageMeta = ttmlLyric.metadata.find((m) => m.key === "language");
	const rawLangCandidate = languageMeta?.value.find((v) => v.trim().length > 0) || i18n.language || "en";
	function toISO639_1(lang: string): string {
		const lower = lang.toLowerCase();
		if (lower.startsWith("zh")) return "zh"; // Covers zh-CN, zh-TW etc.
		if (lower.startsWith("en")) return "en";
		if (lower.startsWith("ja")) return "ja";
		if (lower.startsWith("ko")) return "ko";
		if (lower.startsWith("fr")) return "fr";
		if (lower.startsWith("de")) return "de";
		if (lower.startsWith("es")) return "es";
		if (lower.startsWith("pt")) return "pt";
		if (lower.startsWith("ru")) return "ru";
		// fallback: first 2 letters (basic heuristic)
		return lower.slice(0, 2) || "en";
	}
	const isoLang = toISO639_1(rawLangCandidate);
	ttRoot.setAttribute("xml:lang", isoLang);

	doc.appendChild(ttRoot);

	const head = doc.createElement("head");

	ttRoot.appendChild(head);

	const body = doc.createElement("body");
	const hasOtherPerson = !!lyric.find((v) => v.isDuet);

	const metadataEl = doc.createElement("metadata");
	const mainPersonAgent = doc.createElement("ttm:agent");
	mainPersonAgent.setAttribute("type", "person");
	mainPersonAgent.setAttribute("xml:id", "v1");

	metadataEl.appendChild(mainPersonAgent);

	if (hasOtherPerson) {
		const otherPersonAgent = doc.createElement("ttm:agent");
		otherPersonAgent.setAttribute("type", "other");
		otherPersonAgent.setAttribute("xml:id", "v2");

		metadataEl.appendChild(otherPersonAgent);
	}

	// Extract songwriter metadata first to emit within metadata (matching expected structure)
	const songwriterMeta = ttmlLyric.metadata.find(
		(m) => m.key === "songwriter" && m.value.some((v) => v.trim().length > 0),
	);

	if (songwriterMeta) {
		const iTunesMetadata = doc.createElement("iTunesMetadata");
		iTunesMetadata.setAttribute("xmlns", "http://music.apple.com/lyric-ttml-internal");
		iTunesMetadata.setAttribute("leadingSilence", "0");
		const translationsEl = doc.createElement("translations");
		iTunesMetadata.appendChild(translationsEl);
		const songwritersEl = doc.createElement("songwriters");
		for (const name of songwriterMeta.value) {
			const trimmed = name.trim();
			if (!trimmed) continue;
			const swEl = doc.createElement("songwriter");
			swEl.appendChild(doc.createTextNode(trimmed));
			songwritersEl.appendChild(swEl);
		}
		if (songwritersEl.childNodes.length > 0) {
			iTunesMetadata.appendChild(songwritersEl);
			metadataEl.appendChild(iTunesMetadata);
		}
	}

	// Append remaining metadata entries except songwriter (already represented)
	for (const metadata of ttmlLyric.metadata) {
		if (metadata.key === "songwriter") continue;
		for (const value of metadata.value) {
			const metaEl = doc.createElement("amll:meta");
			metaEl.setAttribute("key", metadata.key);
			metaEl.setAttribute("value", value);
			metadataEl.appendChild(metaEl);
		}
	}

	head.appendChild(metadataEl);

	let i = 0;

	const guessDuration = lyric[lyric.length - 1]?.endTime ?? 0;
	body.setAttribute("dur", msToTimestamp(guessDuration));
	const isDynamicLyric = timingMode === "Word";

	for (const param of params) {
		const paramDiv = doc.createElement("div");
		const beginTime = param[0]?.startTime ?? 0;
		const endTime = param[param.length - 1]?.endTime ?? 0;

		paramDiv.setAttribute("begin", msToTimestamp(beginTime));
		paramDiv.setAttribute("end", msToTimestamp(endTime));

		for (let lineIndex = 0; lineIndex < param.length; lineIndex++) {
			const line = param[lineIndex];
			const lineP = doc.createElement("p");
			const beginTime = line.startTime ?? 0;
			const endTime = line.endTime;

			lineP.setAttribute("begin", msToTimestamp(beginTime));
			lineP.setAttribute("end", msToTimestamp(endTime));

			lineP.setAttribute("ttm:agent", line.isDuet ? "v2" : "v1");
			lineP.setAttribute("itunes:key", `L${++i}`);

			if (isDynamicLyric) {
				let beginTime = Number.POSITIVE_INFINITY;
				let endTime = 0;
				for (const word of line.words) {
					if (word.word.trim().length === 0) {
						lineP.appendChild(doc.createTextNode(word.word));
					} else {
						const span = createWordElement(word);
						lineP.appendChild(span);
						beginTime = Math.min(beginTime, word.startTime);
						endTime = Math.max(endTime, word.endTime);
					}
				}
				lineP.setAttribute("begin", msToTimestamp(line.startTime));
				lineP.setAttribute("end", msToTimestamp(line.endTime));
			} else {
				const word = line.words[0];
				lineP.appendChild(doc.createTextNode(word.word));
				lineP.setAttribute("begin", msToTimestamp(word.startTime));
				lineP.setAttribute("end", msToTimestamp(word.endTime));
			}

			const nextLine = param[lineIndex + 1];
			if (nextLine?.isBG) {
				lineIndex++;
				const bgLine = nextLine;
				const bgLineSpan = doc.createElement("span");
				bgLineSpan.setAttribute("ttm:role", "x-bg");

				if (isDynamicLyric) {
					let beginTime = Number.POSITIVE_INFINITY;
					let endTime = 0;
					for (
						let wordIndex = 0;
						wordIndex < bgLine.words.length;
						wordIndex++
					) {
						const word = bgLine.words[wordIndex];
						if (word.word.trim().length === 0) {
							bgLineSpan.appendChild(doc.createTextNode(word.word));
						} else {
							const span = createWordElement(word);
							if (wordIndex === 0) {
								span.prepend(doc.createTextNode("("));
							}
							if (wordIndex === bgLine.words.length - 1) {
								span.appendChild(doc.createTextNode(")"));
							}
							bgLineSpan.appendChild(span);
							beginTime = Math.min(beginTime, word.startTime);
							endTime = Math.max(endTime, word.endTime);
						}
					}
					bgLineSpan.setAttribute("begin", msToTimestamp(beginTime));
					bgLineSpan.setAttribute("end", msToTimestamp(endTime));
				} else {
					const word = bgLine.words[0];
					bgLineSpan.appendChild(doc.createTextNode(`(${word.word})`));
					bgLineSpan.setAttribute("begin", msToTimestamp(word.startTime));
					bgLineSpan.setAttribute("end", msToTimestamp(word.endTime));
				}

				if (bgLine.translatedLyric) {
					const span = doc.createElement("span");
					span.setAttribute("ttm:role", "x-translation");
					span.setAttribute("xml:lang", "zh-CN");
					span.appendChild(doc.createTextNode(bgLine.translatedLyric));
					bgLineSpan.appendChild(span);
				}

				if (bgLine.romanLyric) {
					const span = doc.createElement("span");
					span.setAttribute("ttm:role", "x-roman");
					span.appendChild(doc.createTextNode(bgLine.romanLyric));
					bgLineSpan.appendChild(span);
				}

				lineP.appendChild(bgLineSpan);
			}

			if (line.translatedLyric) {
				const span = doc.createElement("span");
				span.setAttribute("ttm:role", "x-translation");
				span.setAttribute("xml:lang", "zh-CN");
				span.appendChild(doc.createTextNode(line.translatedLyric));
				lineP.appendChild(span);
			}

			if (line.romanLyric) {
				const span = doc.createElement("span");
				span.setAttribute("ttm:role", "x-roman");
				span.appendChild(doc.createTextNode(line.romanLyric));
				lineP.appendChild(span);
			}

			paramDiv.appendChild(lineP);
		}

		body.appendChild(paramDiv);
	}

	ttRoot.appendChild(body);
	log("ttml document built", ttRoot);

	if (pretty) {
		const xsltDoc = new DOMParser().parseFromString(
			[
				'<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">',
				'  <xsl:strip-space elements="*"/>',
				'  <xsl:template match="para[content-style][not(text())]">',
				'    <xsl:value-of select="normalize-space(.)"/>',
				"  </xsl:template>",
				'  <xsl:template match="node()|@*">',
				'    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
				"  </xsl:template>",
				'  <xsl:output indent="yes"/>',
				"</xsl:stylesheet>",
			].join("\n"),
			"application/xml",
		);

		const xsltProcessor = new XSLTProcessor();
		xsltProcessor.importStylesheet(xsltDoc);
		const resultDoc = xsltProcessor.transformToDocument(doc);

		return new XMLSerializer().serializeToString(resultDoc);
	}
	return new XMLSerializer().serializeToString(doc);
}
