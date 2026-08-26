import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CARD_DIMENSION_OPTIONS, IMAGE_MODEL_OPTIONS, LANGUAGE_OPTIONS } from '../../apiEnums';

/**
 * Parameters for Generation: Create.
 *
 * `additionalOptions` stays a single collection rather than being split across
 * files: n8n's linter enforces alphabetical ordering of its members, and
 * assembling them from several modules would move that ordering out of reach of
 * the static check.
 */
export const createDescription: INodeProperties[] = [
	// ============================================
	// CREATE GENERATION FIELDS (v1.0 only)
	// ============================================
	// Required: Input Text
	{
		displayName: 'Input Text',
		name: 'inputText',
		type: 'string',
		hint: 'With Card Split set to Input Text Breaks, separate cards with a line containing only --- . Joining array items with "\n---\n" gives one card per item.',
		required: true,
		typeOptions: {
			rows: 4,
		},
		default: '',
		placeholder: 'e.g. Create a presentation about renewable energy',
		description: 'Content to generate from - can be a brief prompt or detailed content (max ~400,000 characters)',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					inputText: '={{ $value }}',
				},
			},
		},
	},
	// Required: Text Mode
	{
		displayName: 'Text Mode',
		name: 'textMode',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'AI generates and expands content based on the input',
			},
			{
				name: 'Condense',
				value: 'condense',
				description: 'AI condenses and summarizes the input',
			},
			{
				name: 'Preserve',
				value: 'preserve',
				description: 'Use the input text as written. Choose this when wording must not change, such as dosages, legal terms or contract clauses.',
			},
		],
		default: 'generate',
		description: 'How to handle the input text',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					textMode: '={{ $value }}',
				},
			},
		},
	},
	// Format
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'Presentation',
				value: 'presentation',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Social Post',
				value: 'social',
			},
			{
				name: 'Webpage',
				value: 'webpage',
			},
		],
		default: 'presentation',
		description: 'Output format type',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					format: '={{ $value }}',
				},
			},
		},
	},
	// Additional Options (optional fields grouped for cleaner UI)
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['generation'],
				// File-level options apply to a multi-page generation too. The
				// per-page ones below are hidden for it individually, because
				// `pages` overrides them.
				operation: ['create', 'createMultiPage'],
			},
		},
		options: [
			{
				displayName: 'Additional Instructions',
				name: 'additionalInstructions',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				placeholder: 'e.g. Make the card headings humorous and catchy',
				description: 'Additional instructions for generation (max 2000 characters)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.additionalInstructions') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).additionalInstructions = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'AI Image Model',
				name: 'imageModel',
				type: 'options',
				options: IMAGE_MODEL_OPTIONS,
				default: '',
				description: 'AI model to generate images (only applies if Image Source is AI Generated)',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
					show: {
						imageSource: ['aiGenerated'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.imageModel') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.imageOptions = { ...(body.imageOptions as IDataObject), model: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Audience',
				name: 'audience',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'string',
				default: '',
				placeholder: 'e.g. business executives',
				description: 'Target audience description (max 500 characters)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.audience') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.textOptions = { ...(body.textOptions as IDataObject), audience: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Card Dimensions',
				name: 'cardDimensionsPresentation',
				type: 'options',
				options: CARD_DIMENSION_OPTIONS.presentation,
				default: 'fluid',
				description: 'Card aspect ratio. Only the ratios valid for a presentation are listed.',
				displayOptions: {
					show: {
						'/format': ['presentation'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.cardDimensionsPresentation') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.cardOptions = { ...(body.cardOptions as IDataObject), dimensions: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Card Dimensions',
				name: 'cardDimensionsDocument',
				type: 'options',
				options: CARD_DIMENSION_OPTIONS.document,
				default: 'fluid',
				description: 'Card aspect ratio. Only the ratios valid for a document are listed.',
				displayOptions: {
					show: {
						'/format': ['document'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.cardDimensionsDocument') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.cardOptions = { ...(body.cardOptions as IDataObject), dimensions: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Card Dimensions',
				name: 'cardDimensionsSocial',
				type: 'options',
				options: CARD_DIMENSION_OPTIONS.social,
				default: '1x1',
				description: 'Card aspect ratio. Only the ratios valid for a social are listed.',
				displayOptions: {
					show: {
						'/format': ['social'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.cardDimensionsSocial') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.cardOptions = { ...(body.cardOptions as IDataObject), dimensions: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Card Dimensions',
				name: 'cardDimensionsWebpage',
				type: 'options',
				options: CARD_DIMENSION_OPTIONS.webpage,
				default: 'fluid',
				description: 'Card aspect ratio. Only the ratios valid for a webpage are listed.',
				displayOptions: {
					show: {
						'/format': ['webpage'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.cardDimensionsWebpage') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.cardOptions = { ...(body.cardOptions as IDataObject), dimensions: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Card Split',
				name: 'cardSplit',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Auto',
						value: 'auto',
						description: 'Gamma decides where cards break and honours Number of Cards. Separators in the text are ignored.',
					},
					{
						name: 'Input Text Breaks',
						value: 'inputTextBreaks',
						description: 'One card per --- separator line in Input Text. Number of Cards is ignored, and text with no separator produces a single card.',
					},
				],
				default: 'auto',
				description: 'How to split content into cards',
				routing: {
					request: {
						body: {
							cardSplit: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Email Access Level',
				name: 'emailAccess',
				type: 'options',
				options: [
					{ name: 'View Only', value: 'view' },
					{ name: 'Can Comment', value: 'comment' },
					{ name: 'Can Edit', value: 'edit' },
					{ name: 'Full Access', value: 'fullAccess' },
				],
				default: 'view',
				description: 'Access level for email recipients (only used if Email Recipients is filled)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const recipients = this.getNodeParameter('additionalOptions.emailRecipients') as string;
								const access = this.getNodeParameter('additionalOptions.emailAccess') as string;
								if (recipients && access) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									const sharingOptions = { ...(body.sharingOptions as IDataObject) };
									sharingOptions.emailOptions = { ...(sharingOptions.emailOptions as IDataObject), access };
									body.sharingOptions = sharingOptions;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Email Recipients',
				name: 'emailRecipients',
				type: 'string',
				default: '',
				placeholder: 'e.g. user@example.com, team@example.com',
				description: 'Comma-separated email addresses to share with (max 25)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.emailRecipients') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									const sharingOptions = { ...(body.sharingOptions as IDataObject) };
									sharingOptions.emailOptions = {
										...(sharingOptions.emailOptions as IDataObject),
										recipients: value
											.split(',')
											.map((email: string) => email.trim())
											.filter((email: string) => email),
									};
									body.sharingOptions = sharingOptions;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Enable Search Engine Indexing',
				name: 'enableSearchEngineIndexing',
				type: 'boolean',
				default: false,
				description: 'Whether to allow search engines to index this content',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.enableSearchEngineIndexing') as boolean;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.sharingOptions = { ...(body.sharingOptions as IDataObject), enableSearchEngineIndexing: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Export As',
				name: 'exportAs',
				type: 'options',
				options: [
					{ name: 'None', value: '' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'PNG', value: 'png' },
					{ name: 'PowerPoint (PPTX)', value: 'pptx' },
				],
				default: '',
				description: 'Export format (optional) - provides download URL when generation completes',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.exportAs') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).exportAs = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'External Access',
				name: 'externalAccess',
				type: 'options',
				options: [
					{ name: 'Can Comment', value: 'comment' },
					{ name: 'Can Edit', value: 'edit' },
					{ name: 'Default (Workspace Settings)', value: '' },
					{ name: 'No Access', value: 'noAccess' },
					{ name: 'View Only', value: 'view' },
				],
				default: '',
				description: 'Access level for external users (via link)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.externalAccess') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.sharingOptions = { ...(body.sharingOptions as IDataObject), externalAccess: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Folder',
				name: 'folderIds',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Folder to place the generated Gamma in. The API accepts a single folder.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchFolders',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						hint: 'Paste the ID from the Gamma app or from a List operation',
					},
				],
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.folderIds', '', {
									extractValue: true,
								}) as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const ids = value.split(',').map((id: string) => id.trim()).filter((id: string) => id);
									if (ids.length > 1) {
										throw new NodeOperationError(
											this.getNode(),
											'The \'Folder\' parameter accepts a single folder',
											{ description: 'Gamma places a generation in at most one folder. Remove the extra IDs and keep one.' },
										);
									}
									(requestOptions.body as IDataObject).folderIds = ids;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Header/Footer Config (JSON)',
				name: 'headerFooter',
				type: 'json',
				default: '',
				placeholder: '{"topRight": {"type": "image", "source": "themeLogo", "size": "sm"}, "bottomRight": {"type": "cardNumber"}}',
				description: 'Header/footer configuration as JSON (optional). Example: {"topRight": {"type": "image", "source": "themeLogo"}, "bottomRight": {"type": "cardNumber"}}.',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.headerFooter') as string;
								if (value) {
									try {
										const parsed = JSON.parse(value);
										requestOptions.body = requestOptions.body || {};
										const body = requestOptions.body as IDataObject;
										body.cardOptions = { ...(body.cardOptions as IDataObject), headerFooter: parsed };
									} catch {
										throw new NodeOperationError(
											this.getNode(),
											"The 'Header/Footer Config (JSON)' value isn't valid JSON",
											{ description: 'Enter a JSON object, for example {"topRight": {"type": "image", "source": "themeLogo"}}' },
										);
									}
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Image Source',
				name: 'imageSource',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'options',
				options: [
					{ name: 'AI Generated', value: 'aiGenerated', description: 'Generate images using AI models' },
					{ name: 'Giphy', value: 'giphy', description: 'Get GIFs from Giphy' },
					{ name: 'No Images', value: 'noImages', description: 'Create with no images' },
					{ name: 'Pexels', value: 'pexels', description: 'Get stock photos from Pexels' },
					{ name: 'Pictographic', value: 'pictographic', description: 'Pull images from Pictographic' },
					{ name: 'Placeholder', value: 'placeholder', description: 'Create with placeholder images' },
					{ name: 'Theme Accent', value: 'themeAccent', description: 'Use accent graphics from the theme' },
					{ name: 'Web (All Images)', value: 'webAllImages', description: 'Pull the most relevant images from the web' },
					{ name: 'Web (Commercial)', value: 'webFreeToUseCommercially', description: 'Get images licensed for commercial use' },
					{ name: 'Web (Free to Use)', value: 'webFreeToUse', description: 'Pull images licensed for personal use' },
				],
				default: 'aiGenerated',
				description: 'Where to source images from',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.imageSource') as string;
								if (value && value !== 'aiGenerated') {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.imageOptions = { ...(body.imageOptions as IDataObject), source: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Image Style',
				name: 'imageStyle',
				type: 'string',
				default: '',
				placeholder: 'e.g. photorealistic, minimal, artistic',
				description: 'Style description for AI-generated images (max 500 characters)',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
					show: {
						imageSource: ['aiGenerated'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.imageStyle') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.imageOptions = { ...(body.imageOptions as IDataObject), style: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Language',
				name: 'language',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'options',
				options: LANGUAGE_OPTIONS,
				default: 'en',
				description: 'Language for the generated content',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.language') as string;
								if (value && value !== 'en') {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.textOptions = { ...(body.textOptions as IDataObject), language: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Number of Cards',
				name: 'numCards',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 75,
				},
				default: 10,
				description: 'Target number of cards to generate. Applies only when Card Split is Auto. Your plan caps this (60 on Pro, Teams and Business; 75 on Ultra) -- the User: Get User Information operation returns your exact limit as maxGenerateCards.',
				displayOptions: {
					// Hidden when either applies: `pages` overrides numCards entirely,
					// and Gamma ignores it when splitting on text breaks.
					hide: {
						'/operation': ['createMultiPage'],
						'/additionalOptions.cardSplit': ['inputTextBreaks'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								// Gamma ignores numCards when splitting on text breaks, so don't
								// send a value that cannot apply -- a stale one would otherwise
								// ride along from before Card Split was changed.
								const cardSplit = this.getNodeParameter('additionalOptions.cardSplit', 'auto') as string;
								if (cardSplit === 'inputTextBreaks') {
									return requestOptions;
								}
								const value = this.getNodeParameter('additionalOptions.numCards') as number;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).numCards = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Text Amount',
				name: 'textAmount',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'options',
				options: [
					{ name: 'Brief', value: 'brief' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'Detailed', value: 'detailed' },
					{ name: 'Extensive', value: 'extensive' },
				],
				default: 'medium',
				description: 'Amount of text to generate per card',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.textAmount') as string;
								if (value && value !== 'medium') {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.textOptions = { ...(body.textOptions as IDataObject), amount: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Theme',
				name: 'themeId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Theme to apply. Leave empty to use the workspace default.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchThemes',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						hint: 'Paste the ID from the Gamma app or from a List operation',
					},
				],
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.themeId', '', {
									extractValue: true,
								}) as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).themeId = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Q3 Results Overview',
				description:
					'Title for the generated Gamma. Leave empty to have one generated from the content.',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.title') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).title = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Tone',
				name: 'tone',
				displayOptions: {
					hide: {
						'/operation': ['createMultiPage'],
					},
				},
				type: 'string',
				default: '',
				placeholder: 'e.g. professional and friendly',
				description: 'Tone description for generated content (max 500 characters)',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.tone') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.textOptions = { ...(body.textOptions as IDataObject), tone: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Workspace Access',
				name: 'workspaceAccess',
				type: 'options',
				options: [
					{ name: 'Can Comment', value: 'comment' },
					{ name: 'Can Edit', value: 'edit' },
					{ name: 'Default (Workspace Settings)', value: '' },
					{ name: 'Full Access', value: 'fullAccess' },
					{ name: 'No Access', value: 'noAccess' },
					{ name: 'View Only', value: 'view' },
				],
				default: '',
				description: 'Access level for workspace members',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('additionalOptions.workspaceAccess') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									const body = requestOptions.body as IDataObject;
									body.sharingOptions = { ...(body.sharingOptions as IDataObject), workspaceAccess: value };
								}
								return requestOptions;
							},
						],
					},
				},
			},
		],
	},
];
