import { INodeType, INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

export class Gamma implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gamma',
		name: 'gamma',
		icon: 'file:gamma.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create AI-powered presentations, documents, and websites with Gamma',
		defaults: {
			name: 'Gamma',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gammaApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://public-api.gamma.app',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// ============================================
			// RESOURCE SELECTOR
			// ============================================
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generation',
						value: 'generation',
						description: 'Create and manage AI-generated presentations, documents, and social posts',
					},
					{
						name: 'Theme',
						value: 'theme',
						description: 'Browse available themes (read-only - use to get theme IDs)',
					},
					{
						name: 'Folder',
						value: 'folder',
						description: 'Browse workspace folders (read-only - use to get folder IDs)',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Get your account information',
					},
				],
				default: 'generation',
			},

			// ============================================
			// GENERATION OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['generation'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a generation',
						description: 'Create a new presentation, document, social post, or webpage',
						routing: {
							request: {
								method: 'POST',
								url: '/v1.0/generations',
							},
						},
					},
					{
						name: 'Create from Template',
						value: 'createFromTemplate',
						action: 'Create from template',
						description: 'Remix an existing Gamma with new prompt',
						routing: {
							request: {
								method: 'POST',
								url: '/v1.0/generations/from-template',
							},
						},
					},
					{
						name: 'Get Status',
						value: 'getStatus',
						action: 'Get generation status',
						description: 'Check the status of a generation',
						routing: {
							request: {
								method: 'GET',
								url: '=/v1.0/generations/{{$parameter["generationId"]}}',
							},
						},
					},
				],
				default: 'create',
			},

			// ============================================
			// CREATE GENERATION FIELDS (v1.0 only)
			// ============================================
			
			// Required: Input Text
			{
				displayName: 'Input Text',
				name: 'inputText',
				type: 'string',
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
						description: 'AI preserves the input text structure exactly',
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
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Number of Cards',
						name: 'numCards',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 75,
						},
						default: 10,
						description: 'Number of cards/slides to generate (max 60 for Pro, 75 for Ultra)',
						routing: {
							request: {
								body: {
									numCards: '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Card Split',
						name: 'cardSplit',
						type: 'options',
						options: [
							{
								name: 'Auto',
								value: 'auto',
								description: 'AI automatically determines card breaks based on Number of Cards',
							},
							{
								name: 'Input Text Breaks',
								value: 'inputTextBreaks',
								description: 'Use \\n---\\n breaks from input text to split cards',
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
						displayName: 'Theme ID',
						name: 'themeId',
						type: 'string',
						default: '',
						placeholder: 'e.g. abc123def456 (leave empty for workspace default)',
						description: 'Theme ID from List Themes operation. Leave empty to use workspace default theme.',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('themeId') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											(requestOptions.body as any).themeId = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
					{
						displayName: 'Additional Instructions',
						name: 'additionalInstructions',
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
										const value = this.getNodeParameter('additionalInstructions') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											(requestOptions.body as any).additionalInstructions = value;
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
										const value = this.getNodeParameter('textAmount') as string;
										if (value && value !== 'medium') {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.textOptions = body.textOptions || {};
											body.textOptions.amount = value;
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
						type: 'string',
						default: '',
						placeholder: 'e.g. professional and friendly',
						description: 'Tone description for generated content (max 500 characters)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('tone') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.textOptions = body.textOptions || {};
											body.textOptions.tone = value;
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
						type: 'string',
						default: '',
						placeholder: 'e.g. business executives',
						description: 'Target audience description (max 500 characters)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('audience') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.textOptions = body.textOptions || {};
											body.textOptions.audience = value;
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
						type: 'options',
						options: [
							{ name: 'English (US)', value: 'en' },
							{ name: 'Spanish', value: 'es' },
							{ name: 'French', value: 'fr' },
							{ name: 'German', value: 'de' },
							{ name: 'Italian', value: 'it' },
							{ name: 'Portuguese (Brazil)', value: 'pt-br' },
							{ name: 'Japanese', value: 'ja' },
							{ name: 'Korean', value: 'ko' },
							{ name: 'Simplified Chinese', value: 'zh-cn' },
							{ name: 'Traditional Chinese', value: 'zh-tw' },
							{ name: 'Hindi', value: 'hi' },
							{ name: 'Arabic', value: 'ar' },
							{ name: 'Russian', value: 'ru' },
							{ name: 'Dutch', value: 'nl' },
							{ name: 'Polish', value: 'pl' },
							{ name: 'Turkish', value: 'tr' },
							{ name: 'Swedish', value: 'sv' },
							{ name: 'Other (Enter Code)', value: 'other' },
						],
						default: 'en',
						description: 'Language for generated content (supports 67 languages total)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('language') as string;
										if (value && value !== 'en') {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.textOptions = body.textOptions || {};
											body.textOptions.language = value;
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
						type: 'options',
						options: [
							{ name: 'AI Generated', value: 'aiGenerated', description: 'Generate images using AI models' },
							{ name: 'Unsplash', value: 'unsplash', description: 'Get images from Unsplash' },
							{ name: 'Web (Free to Use)', value: 'webFreeToUse', description: 'Pull images licensed for personal use' },
							{ name: 'Web (Commercial)', value: 'webFreeToUseCommercially', description: 'Get images licensed for commercial use' },
							{ name: 'Web (All Images)', value: 'webAllImages', description: 'Pull the most relevant images from the web' },
							{ name: 'Pictographic', value: 'pictographic', description: 'Pull images from Pictographic' },
							{ name: 'Giphy', value: 'giphy', description: 'Get GIFs from Giphy' },
							{ name: 'Placeholder', value: 'placeholder', description: 'Create with placeholder images' },
							{ name: 'No Images', value: 'noImages', description: 'Create with no images' },
						],
						default: 'aiGenerated',
						description: 'Where to source images from',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('imageSource') as string;
										if (value && value !== 'aiGenerated') {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.imageOptions = body.imageOptions || {};
											body.imageOptions.source = value;
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
						options: [
							{ name: 'Auto (Let Gamma Choose)', value: '' },
							{ name: 'Flux Fast 1.1 (2 credits)', value: 'flux-1-quick' },
							{ name: 'Imagen 3 Fast (2 credits)', value: 'imagen-3-flash' },
							{ name: 'Flux Pro (8 credits)', value: 'flux-1-pro' },
							{ name: 'Imagen 3 (8 credits)', value: 'imagen-3-pro' },
							{ name: 'Ideogram 3 Turbo (10 credits)', value: 'ideogram-v3-turbo' },
							{ name: 'Leonardo Phoenix (15 credits)', value: 'leonardo-phoenix' },
							{ name: 'Imagen 4 (20 credits)', value: 'imagen-4-pro' },
							{ name: 'Recraft (20 credits)', value: 'recraft-v3' },
							{ name: 'Dall-E 3 (33 credits)', value: 'dall-e-3' },
							{ name: 'Flux Ultra (30 credits - Ultra plan)', value: 'flux-1-ultra' },
						],
						default: '',
						description: 'AI model to generate images (only applies if Image Source is AI Generated)',
						displayOptions: {
							show: {
								imageSource: ['aiGenerated'],
							},
						},
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('imageModel') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.imageOptions = body.imageOptions || {};
											body.imageOptions.model = value;
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
							show: {
								imageSource: ['aiGenerated'],
							},
						},
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('imageStyle') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.imageOptions = body.imageOptions || {};
											body.imageOptions.style = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
					{
						displayName: 'Card Dimensions',
						name: 'cardDimensions',
						type: 'options',
						options: [
							{ name: 'Fluid (Auto-Adjust)', value: 'fluid' },
							{ name: '16:9 (Widescreen)', value: '16x9' },
							{ name: '4:3 (Standard)', value: '4x3' },
							{ name: 'Letter', value: 'letter' },
							{ name: 'A4', value: 'a4' },
							{ name: 'Pageless', value: 'pageless' },
							{ name: '1:1 (Square)', value: '1x1' },
							{ name: '4:5 (Portrait)', value: '4x5' },
							{ name: '9:16 (Vertical)', value: '9x16' },
						],
						default: 'fluid',
						description: 'Card aspect ratio/dimensions',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('cardDimensions') as string;
										if (value && value !== 'fluid') {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.cardOptions = body.cardOptions || {};
											body.cardOptions.dimensions = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
					{
						displayName: 'Folder IDs',
						name: 'folderIds',
						type: 'string',
						default: '',
						placeholder: 'e.g. fold_abc123,fold_xyz789',
						description: 'Comma-separated folder IDs to organize the generation. Use List Folders to get IDs.',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('folderIds') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											(requestOptions.body as any).folderIds = value.split(',').map((id: string) => id.trim()).filter((id: string) => id);
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
							{ name: 'Default (Workspace Settings)', value: '' },
							{ name: 'No Access', value: 'noAccess' },
							{ name: 'View Only', value: 'view' },
							{ name: 'Can Comment', value: 'comment' },
							{ name: 'Can Edit', value: 'edit' },
							{ name: 'Full Access', value: 'fullAccess' },
						],
						default: '',
						description: 'Access level for workspace members',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('workspaceAccess') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.sharingOptions = body.sharingOptions || {};
											body.sharingOptions.workspaceAccess = value;
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
							{ name: 'Default (Workspace Settings)', value: '' },
							{ name: 'No Access', value: 'noAccess' },
							{ name: 'View Only', value: 'view' },
							{ name: 'Can Comment', value: 'comment' },
							{ name: 'Can Edit', value: 'edit' },
						],
						default: '',
						description: 'Access level for external users (via link)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('externalAccess') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.sharingOptions = body.sharingOptions || {};
											body.sharingOptions.externalAccess = value;
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
										const value = this.getNodeParameter('enableSearchEngineIndexing') as boolean;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.sharingOptions = body.sharingOptions || {};
											body.sharingOptions.enableSearchEngineIndexing = value;
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
						description: 'Header/footer configuration as JSON (optional). Example: {"topRight": {"type": "image", "source": "themeLogo"}, "bottomRight": {"type": "cardNumber"}}',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('headerFooter') as string;
										if (value) {
											try {
												const parsed = JSON.parse(value);
												requestOptions.body = requestOptions.body || {};
												const body = requestOptions.body as any;
												body.cardOptions = body.cardOptions || {};
												body.cardOptions.headerFooter = parsed;
											} catch (error) {
												throw new Error('headerFooter must be valid JSON');
											}
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
										const value = this.getNodeParameter('emailRecipients') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.sharingOptions = body.sharingOptions || {};
											body.sharingOptions.emailOptions = body.sharingOptions.emailOptions || {};
											body.sharingOptions.emailOptions.recipients = value
												.split(',')
												.map((email: string) => email.trim())
												.filter((email: string) => email);
										}
										return requestOptions;
									},
								],
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
										const recipients = this.getNodeParameter('emailRecipients') as string;
										const access = this.getNodeParameter('emailAccess') as string;
										if (recipients && access) {
											requestOptions.body = requestOptions.body || {};
											const body = requestOptions.body as any;
											body.sharingOptions = body.sharingOptions || {};
											body.sharingOptions.emailOptions = body.sharingOptions.emailOptions || {};
											body.sharingOptions.emailOptions.access = access;
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
							{ name: 'PowerPoint (PPTX)', value: 'pptx' },
						],
						default: '',
						description: 'Export format (optional) - provides download URL when generation completes',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('exportAs') as string;
										if (value) {
											requestOptions.body = requestOptions.body || {};
											(requestOptions.body as any).exportAs = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
				],
			},

			// ============================================
			// CREATE FROM TEMPLATE FIELDS
			// ============================================
			
			// Prompt (required for createFromTemplate)
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 3,
				},
				default: '',
				placeholder: 'e.g. Remake this presentation for a technical audience',
				description: 'New prompt to regenerate the template with',
				displayOptions: {
					show: {
						resource: ['generation'],
						operation: ['createFromTemplate'],
					},
				},
				routing: {
					request: {
						body: {
							prompt: '={{ $value }}',
						},
					},
				},
			},

			// Gamma ID (required for createFromTemplate)
			{
				displayName: 'Gamma ID',
				name: 'gammaId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. file_abc123',
				description: 'File ID of the Gamma to use as template (must be single-page). Get from Gamma URL.',
				displayOptions: {
					show: {
						resource: ['generation'],
						operation: ['createFromTemplate'],
					},
				},
				routing: {
					request: {
						body: {
							gammaId: '={{ $value }}',
						},
					},
				},
			},

			// Theme ID for createFromTemplate
			{
				displayName: 'Theme ID',
				name: 'templateThemeId',
				type: 'string',
				default: '',
				placeholder: 'e.g. abc123def456 (leave empty for template theme)',
				description: 'Theme ID to apply (optional). Leave empty to use template theme.',
				displayOptions: {
					show: {
						resource: ['generation'],
						operation: ['createFromTemplate'],
					},
				},
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('templateThemeId') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as any).themeId = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},

			// ============================================
			// GET STATUS FIELD
			// ============================================
			{
				displayName: 'Generation ID',
				name: 'generationId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. abc123xyz',
				description: 'Generation ID returned from Create Generation operation',
				displayOptions: {
					show: {
						resource: ['generation'],
						operation: ['getStatus'],
					},
				},
			},

			// ============================================
			// THEME OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['theme'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List themes',
						description: 'Get available themes from your workspace',
						routing: {
							request: {
								method: 'GET',
								url: '/v1.0/themes',
							},
						},
					},
				],
				default: 'list',
			},
			{
				displayName: 'Additional Fields',
				name: 'themeAdditionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: {
					show: {
						resource: ['theme'],
						operation: ['list'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 200,
						},
						description: 'Number of items per page (max 200)',
						routing: {
							request: {
								qs: {
									limit: '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Search Query',
						name: 'query',
						type: 'string',
						default: '',
						placeholder: 'e.g. modern',
						description: 'Filter themes by name (case-insensitive)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('query') as string;
										if (value) {
											requestOptions.qs = requestOptions.qs || {};
											(requestOptions.qs as any).query = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
				],
			},

			// ============================================
			// FOLDER OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['folder'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List folders',
						description: 'Get workspace folders',
						routing: {
							request: {
								method: 'GET',
								url: '/v1.0/folders',
							},
						},
					},
				],
				default: 'list',
			},
			{
				displayName: 'Additional Fields',
				name: 'folderAdditionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['list'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 200,
						},
						description: 'Number of items per page (max 200)',
						routing: {
							request: {
								qs: {
									limit: '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Search Query',
						name: 'folderQuery',
						type: 'string',
						default: '',
						placeholder: 'e.g. marketing',
						description: 'Filter folders by name (case-insensitive)',
						routing: {
							send: {
								preSend: [
									async function (this, requestOptions) {
										const value = this.getNodeParameter('folderQuery') as string;
										if (value) {
											requestOptions.qs = requestOptions.qs || {};
											(requestOptions.qs as any).query = value;
										}
										return requestOptions;
									},
								],
							},
						},
					},
				],
			},

			// ============================================
			// USER OPERATIONS  
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get Me',
						value: 'getMe',
						action: 'Get user information',
						description: 'Get authenticated user and workspace information',
						routing: {
							request: {
								method: 'GET',
								url: '/v1.0/me',
							},
						},
					},
				],
				default: 'getMe',
			},
		],
	};
}
