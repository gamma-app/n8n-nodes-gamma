// GENERATED FILE -- do not edit by hand.
// Run `npm run sync:enums` to regenerate from Gamma's published API docs.
// Sources:
//   https://developers.gamma.app/generations/create-generation.md
//   https://developers.gamma.app/reference/image-model-accepted-values.md
//   https://developers.gamma.app/reference/output-language-accepted-values.md
//
// Options are pre-sorted by name to satisfy n8n's node linter.
import type { INodePropertyOptions } from 'n8n-workflow';

/** Image models valid for imageOptions.model, with credit cost as subtext. */
export const IMAGE_MODEL_OPTIONS: INodePropertyOptions[] = [
	{ name: "Auto (Let Gamma Choose)", value: "", description: "Let Gamma pick a model" },
	{ name: "Dall-E 3", value: "dall-e-3", description: "33 credits per image" },
	{ name: "Flux 1 Pro", value: "flux-1-pro", description: "8 credits per image" },
	{ name: "Flux 1 Quick", value: "flux-1-quick", description: "2 credits per image" },
	{ name: "Flux 1 Ultra", value: "flux-1-ultra", description: "30 credits per image" },
	{ name: "Flux 2 Fast", value: "flux-2-klein", description: "2 credits per image" },
	{ name: "Flux 2 Flex", value: "flux-2-flex", description: "20 credits per image" },
	{ name: "Flux 2 Max", value: "flux-2-max", description: "20 credits per image" },
	{ name: "Flux 2 Pro", value: "flux-2-pro", description: "8 credits per image" },
	{ name: "Flux Kontext Fast", value: "flux-kontext-fast", description: "2 credits per image" },
	{ name: "Flux Kontext Max", value: "flux-kontext-max", description: "40 credits per image" },
	{ name: "Flux Kontext Pro", value: "flux-kontext-pro", description: "20 credits per image" },
	{ name: "GPT Image", value: "gpt-image-1-medium", description: "30 credits per image" },
	{ name: "GPT Image 2", value: "gpt-image-2", description: "20 credits per image" },
	{ name: "GPT Image 2 HD", value: "gpt-image-2-hd", description: "115 credits per image" },
	{ name: "GPT Image 2 Mini", value: "gpt-image-2-mini", description: "5 credits per image" },
	{ name: "GPT Image Detailed", value: "gpt-image-1-high", description: "120 credits per image" },
	{ name: "GPT Image Mini High", value: "gpt-image-1-mini-high", description: "20 credits per image" },
	{ name: "GPT Image Mini Low", value: "gpt-image-1-mini-low", description: "2 credits per image" },
	{ name: "GPT Image Mini Medium", value: "gpt-image-1-mini-medium", description: "8 credits per image" },
	{ name: "Ideogram 3", value: "ideogram-v3", description: "20 credits per image" },
	{ name: "Ideogram 3 Quality", value: "ideogram-v3-quality", description: "45 credits per image" },
	{ name: "Ideogram 3 Turbo", value: "ideogram-v3-turbo", description: "6 credits per image" },
	{ name: "Leonardo Phoenix", value: "leonardo-phoenix", description: "15 credits per image" },
	{ name: "Luma Photon", value: "luma-photon-1", description: "10 credits per image" },
	{ name: "Luma Photon Flash", value: "luma-photon-flash-1", description: "2 credits per image" },
	{ name: "Nano Banana 2", value: "gemini-3.1-flash-image", description: "50 credits per image" },
	{ name: "Nano Banana 2 HD", value: "gemini-3.1-flash-image-hd", description: "75 credits per image" },
	{ name: "Nano Banana 2 Mini", value: "gemini-3.1-flash-image-mini", description: "34 credits per image" },
	{ name: "Nano Banana Flash (Gemini 2.5 Flash)", value: "gemini-2.5-flash-image", description: "20 credits per image" },
	{ name: "Nano Banana Pro (Gemini 3 Pro)", value: "gemini-3-pro-image", description: "70 credits per image" },
	{ name: "Nano Banana Pro HD (Gemini 3 Pro HD)", value: "gemini-3-pro-image-hd", description: "120 credits per image" },
	{ name: "Recraft V3", value: "recraft-v3", description: "20 credits per image" },
	{ name: "Recraft V3 Vector", value: "recraft-v3-svg", description: "40 credits per image" },
	{ name: "Recraft V4", value: "recraft-v4", description: "12 credits per image" },
	{ name: "Recraft V4 Pro", value: "recraft-v4-pro", description: "125 credits per image" },
	{ name: "Recraft V4 Vector", value: "recraft-v4-svg", description: "40 credits per image" },
];

/** Output languages for textOptions.language. */
export const LANGUAGE_OPTIONS: INodePropertyOptions[] = [
	{ name: "Afrikaans", value: "af" },
	{ name: "Albanian", value: "sq" },
	{ name: "Arabic", value: "ar" },
	{ name: "Arabic (Saudi Arabia)", value: "ar-sa" },
	{ name: "Bengali", value: "bn" },
	{ name: "Bosnian", value: "bs" },
	{ name: "Bulgarian", value: "bg" },
	{ name: "Catalan", value: "ca" },
	{ name: "Croatian", value: "hr" },
	{ name: "Czech", value: "cs" },
	{ name: "Danish", value: "da" },
	{ name: "Dutch", value: "nl" },
	{ name: "English (India)", value: "en-in" },
	{ name: "English (UK)", value: "en-gb" },
	{ name: "English (US)", value: "en" },
	{ name: "Estonian", value: "et" },
	{ name: "Finnish", value: "fi" },
	{ name: "French", value: "fr" },
	{ name: "German", value: "de" },
	{ name: "Greek", value: "el" },
	{ name: "Gujarati", value: "gu" },
	{ name: "Hausa", value: "ha" },
	{ name: "Hebrew", value: "he" },
	{ name: "Hindi", value: "hi" },
	{ name: "Hungarian", value: "hu" },
	{ name: "Icelandic", value: "is" },
	{ name: "Indonesian", value: "id" },
	{ name: "Italian", value: "it" },
	{ name: "Japanese (Plain Style)", value: "ja-da" },
	{ name: "Japanese (Polite Style)", value: "ja" },
	{ name: "Kannada", value: "kn" },
	{ name: "Kazakh", value: "kk" },
	{ name: "Korean", value: "ko" },
	{ name: "Latvian", value: "lv" },
	{ name: "Lithuanian", value: "lt" },
	{ name: "Macedonian", value: "mk" },
	{ name: "Malay", value: "ms" },
	{ name: "Malayalam", value: "ml" },
	{ name: "Marathi", value: "mr" },
	{ name: "Norwegian", value: "nb" },
	{ name: "Persian", value: "fa" },
	{ name: "Polish", value: "pl" },
	{ name: "Portuguese (Brazil)", value: "pt-br" },
	{ name: "Portuguese (Portugal)", value: "pt-pt" },
	{ name: "Romanian", value: "ro" },
	{ name: "Russian", value: "ru" },
	{ name: "Serbian", value: "sr" },
	{ name: "Simplified Chinese", value: "zh-cn" },
	{ name: "Slovenian", value: "sl" },
	{ name: "Spanish", value: "es" },
	{ name: "Spanish (Latin America)", value: "es-419" },
	{ name: "Spanish (Mexico)", value: "es-mx" },
	{ name: "Spanish (Spain)", value: "es-es" },
	{ name: "Swahili", value: "sw" },
	{ name: "Swedish", value: "sv" },
	{ name: "Tagalog", value: "tl" },
	{ name: "Tamil", value: "ta" },
	{ name: "Telugu", value: "te" },
	{ name: "Thai", value: "th" },
	{ name: "Traditional Chinese", value: "zh-tw" },
	{ name: "Turkish", value: "tr" },
	{ name: "Ukrainian", value: "uk" },
	{ name: "Urdu", value: "ur" },
	{ name: "Uzbek", value: "uz" },
	{ name: "Vietnamese", value: "vi" },
	{ name: "Welsh", value: "cy" },
	{ name: "Yoruba", value: "yo" },
];

/** Accepted values for imageOptions.source. */
export const IMAGE_SOURCE_VALUES = ["aiGenerated","giphy","noImages","pexels","pictographic","placeholder","themeAccent","webAllImages","webFreeToUse","webFreeToUseCommercially"] as const;

/** Accepted values for exportAs. */
export const EXPORT_AS_VALUES = ["pdf","png","pptx"] as const;

/** Card dimensions accepted by each format. Invalid pairs are overridden by the
 *  API with a warning, so the node only offers the valid ones. */
export const CARD_DIMENSION_OPTIONS: Record<string, INodePropertyOptions[]> = {
	presentation: [
		{ name: "16:9 (Widescreen)", value: "16x9" },
		{ name: "4:3 (Standard)", value: "4x3" },
		{ name: "Fluid (Auto-Adjust)", value: "fluid" },
	],
	document: [
		{ name: "A4", value: "a4" },
		{ name: "Fluid (Auto-Adjust)", value: "fluid" },
		{ name: "Letter", value: "letter" },
		{ name: "Pageless", value: "pageless" },
	],
	social: [
		{ name: "1:1 (Square)", value: "1x1" },
		{ name: "4:5 (Portrait)", value: "4x5" },
		{ name: "9:16 (Vertical)", value: "9x16" },
	],
	webpage: [
		{ name: "Fluid (Auto-Adjust)", value: "fluid" },
	],
};

/** Image-model values the spec accepts but the image-model reference table does
 *  not document (video models). Kept for drift visibility, not offered in the UI. */
export const UNDOCUMENTED_MODEL_VALUES = ["leonardo-motion-2","leonardo-motion-2-fast","luma-ray-2","luma-ray-2-flash","veo-3.1","veo-3.1-fast"] as const;
