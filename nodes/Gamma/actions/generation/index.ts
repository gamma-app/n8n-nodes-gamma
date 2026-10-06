import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INode, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { sendIfSet } from '../sendIfSet';
import { createAgentDescription, createDescription } from './create.operation';

const multiPageShow = { resource: ['generation'], operation: ['createMultiPage'] };

/** Fields the API accepts on each entry of the `pages` array. */
type PageInput = {
	inputText?: string;
	title?: string;
	format?: string;
	textMode?: string;
	cardSplit?: string;
	numCards?: number;
	additionalInstructions?: string;
	path?: string;
};

const MAX_PAGES = 50;

/** Shared validation, so the JSON and Fields modes fail the same way. */
function validatePages(pages: unknown, node: INode): PageInput[] {
	if (!Array.isArray(pages)) {
		throw new NodeOperationError(node, 'Pages must be an array', {
			description: 'Provide a JSON array of page objects, for example [{"inputText": "..."}].',
		});
	}
	if (pages.length === 0) {
		throw new NodeOperationError(node, 'Add at least one page', {
			description: 'A multi-page generation needs one or more pages.',
		});
	}
	if (pages.length > MAX_PAGES) {
		throw new NodeOperationError(
			node,
			`Gamma accepts at most ${MAX_PAGES} pages, but ${pages.length} were provided`,
			{ description: `Split the work across several generations of ${MAX_PAGES} pages or fewer.` },
		);
	}
	pages.forEach((page, i) => {
		if (typeof page !== 'object' || page === null || Array.isArray(page)) {
			throw new NodeOperationError(node, `Page ${i + 1} is not an object`, {
				description: 'Each entry must be an object, for example {"inputText": "..."}.',
			});
		}
		if (!(page as PageInput).inputText) {
			throw new NodeOperationError(node, `Page ${i + 1} has no Input Text`, {
				description: 'inputText is the only field the API requires on every page.',
			});
		}
	});
	return pages as PageInput[];
}

const operationOptions: INodePropertyOptions[] = [
	{
		name: 'Create (Classic)',
		value: 'create',
		action: 'Create generation',
		description: 'Create a presentation, document, social post or webpage on the classic engine',
		routing: {
			request: {
				method: 'POST',
				url: '/v1.0/generations',
			},
		},
	},
	{
		name: 'Create From Template',
		value: 'createFromTemplate',
		action: 'Create from template',
		description: 'Remix an existing Gamma with new prompt (classic engine)',
		routing: {
			request: {
				method: 'POST',
				url: '/v1.0/generations/from-template',
			},
		},
	},
	{
		name: 'Create Multi-Page',
		value: 'createMultiPage',
		action: 'Create multi page file',
		description:
			'Generate a file of up to 50 pages in one request, optionally published as a Gamma site (classic engine)',
		routing: {
			request: {
				method: 'POST',
				url: '/v1.0/generations',
			},
		},
	},
	{
		name: 'Create with Gamma 5',
		value: 'createAgent',
		action: 'Create with gamma 5',
		description: 'Have the Gamma 5 agent plan, write and design a presentation, document or social post',
		routing: {
			request: {
				method: 'POST',
				url: '/v1.0/agent/generations',
			},
		},
	},
	{
		name: 'Get Status',
		value: 'getStatus',
		action: 'Get generation status',
		description: 'Check the status of a generation from either engine',
		routing: {
			request: {
				method: 'GET',
				// Gamma 5 IDs start with gen_ and live under /agent; classic IDs do not.
				url: '=/v1.0/{{ $parameter["generationId"].startsWith("gen_") ? "agent/" : "" }}generations/{{$parameter["generationId"]}}',
			},
		},
	},
];

/** The Operation selector, once per node version: only the default differs. */
const operation = (version: number, defaultOperation: string): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['generation'],
			'@version': [version],
		},
	},
	options: operationOptions,
	default: defaultOperation,
});

/** Operations and parameters for the Generation resource. Create lives in its own file for its size. */
export const generationDescription: INodeProperties[] = [
	operation(1, 'create'),
	operation(2, 'createAgent'),
	...createDescription,
	...createAgentDescription,
	// Create Multi-Page
	{
		displayName:
			'A multi-page generation replaces Input Text with a Pages array. Per-page settings live inside each page; the options below still apply to the whole file.',
		name: 'multiPageNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: multiPageShow },
	},
	{
		displayName: 'Pages Input',
		name: 'pagesInputMode',
		type: 'options',
		options: [
			{
				name: 'JSON',
				value: 'json',
				description: 'Supply an array, typically built from earlier items in the workflow',
			},
			{
				name: 'Define Below',
				value: 'fields',
				description: 'Fill in each page by hand. Practical for a handful of pages.',
			},
		],
		default: 'json',
		description: 'How to provide the pages',
		displayOptions: { show: multiPageShow },
	},
	{
		displayName: 'Pages',
		name: 'pagesJson',
		type: 'json',
		required: true,
		default: '[\n  {\n    "inputText": "First page"\n  }\n]',
		typeOptions: {
			rows: 8,
		},
		description:
			'Array of page objects, 1 to 50. Only inputText is required on each; title, format, textMode, cardSplit, numCards, additionalInstructions and path are optional.',
		hint: 'Build this from upstream items with a Code node when generating a site from data',
		displayOptions: {
			show: { ...multiPageShow, pagesInputMode: ['json'] },
		},
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const raw = this.getNodeParameter('pagesJson') as string | unknown[];
						let parsed: unknown;
						if (typeof raw === 'string') {
							try {
								parsed = JSON.parse(raw);
							} catch {
								throw new NodeOperationError(this.getNode(), 'Pages is not valid JSON', {
									description: 'Provide a JSON array, for example [{"inputText": "..."}].',
								});
							}
						} else {
							parsed = raw;
						}
						const pages = validatePages(parsed, this.getNode());
						requestOptions.body = requestOptions.body || {};
						(requestOptions.body as IDataObject).pages = pages as unknown as IDataObject[];
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pagesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		default: {},
		placeholder: 'Add page',
		description: 'Pages to generate, in order. The first becomes the file\'s main page.',
		displayOptions: {
			show: { ...multiPageShow, pagesInputMode: ['fields'] },
		},
		options: [
			{
				displayName: 'Page',
				name: 'page',
				values: [
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'Document',
								value: 'document',
							},
							{
								name: 'Presentation',
								value: 'presentation',
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
						default: 'webpage',
						description: 'Output format for this page',
					},
					{
						displayName: 'Input Text',
						name: 'inputText',
						type: 'string',
						default: '',
						placeholder: 'e.g. Our approach to sustainable packaging',
						description: 'Content for this page. The only field the API requires.',
					},
					{
						displayName: 'Text Mode',
						name: 'textMode',
						type: 'options',
						options: [
							{
								name: 'Condense',
								value: 'condense',
							},
							{
								name: 'Generate',
								value: 'generate',
							},
							{
								name: 'Preserve',
								value: 'preserve',
							},
					],
						default: 'generate',
						description: 'How to treat this page\'s input text',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						placeholder: 'e.g. Sustainability',
						description: 'Title for this page. Generated from the content when empty.',
					},
					{
						displayName: 'URL Path',
						name: 'path',
						type: 'string',
						default: '',
						placeholder: 'e.g. sustainability',
						description: 'Slug for this page within the published site. Ignored for the first page, whose path is the site root.',
					},
			],
			},
		],
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const value = this.getNodeParameter('pagesUi', {}) as { page?: PageInput[] };
						const pages = validatePages(value.page ?? [], this.getNode()).map((page) =>
							// Drop empty optional fields rather than sending "".
							Object.fromEntries(Object.entries(page).filter(([, v]) => v !== '' && v !== undefined)),
						);
						requestOptions.body = requestOptions.body || {};
						(requestOptions.body as IDataObject).pages = pages as IDataObject[];
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Publish as Site',
		name: 'publish',
		type: 'boolean',
		default: false,
		description:
			'Whether to publish the file as a Gamma site once every page succeeds. Only meaningful for multi-page generations.',
		displayOptions: { show: multiPageShow },
		routing: {
			request: {
				body: {
					publish: '={{ $value }}',
				},
			},
		},
	},
	// Create from Template
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
		displayName: 'Theme',
		name: 'templateThemeId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Optional theme override. Leave empty to keep the template theme.',
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
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['createFromTemplate'],
			},
		},
		routing: sendIfSet('templateThemeId', 'body.themeId', { extractValue: true }),
	},
	// Get Status
	{
		displayName: 'Generation ID',
		name: 'generationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. gen_V1StGXR8Z5jdHi6B',
		description:
			'The generationId a Create operation returned. Gamma 5 IDs start with gen_; either kind works here.',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['getStatus'],
			},
		},
	},
];
