import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

const show = { resource: ['generation'], operation: ['createMultiPage'] };

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
function validatePages(pages: unknown, node: { name: string }): PageInput[] {
	if (!Array.isArray(pages)) {
		throw new NodeOperationError(node as never, 'Pages must be an array', {
			description: 'Provide a JSON array of page objects, for example [{"inputText": "..."}].',
		});
	}
	if (pages.length === 0) {
		throw new NodeOperationError(node as never, 'Add at least one page', {
			description: 'A multi-page generation needs one or more pages.',
		});
	}
	if (pages.length > MAX_PAGES) {
		throw new NodeOperationError(
			node as never,
			`Gamma accepts at most ${MAX_PAGES} pages, but ${pages.length} were provided`,
			{ description: `Split the work across several generations of ${MAX_PAGES} pages or fewer.` },
		);
	}
	pages.forEach((page, i) => {
		if (typeof page !== 'object' || page === null || Array.isArray(page)) {
			throw new NodeOperationError(node as never, `Page ${i + 1} is not an object`, {
				description: 'Each entry must be an object, for example {"inputText": "..."}.',
			});
		}
		if (!(page as PageInput).inputText) {
			throw new NodeOperationError(node as never, `Page ${i + 1} has no Input Text`, {
				description: 'inputText is the only field the API requires on every page.',
			});
		}
	});
	return pages as PageInput[];
}

export const createMultiPageDescription: INodeProperties[] = [
	{
		displayName:
			'A multi-page generation replaces Input Text with a Pages array. Per-page settings live inside each page; the options below still apply to the whole file.',
		name: 'multiPageNotice',
		type: 'notice',
		default: '',
		displayOptions: { show },
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
		displayOptions: { show },
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
			show: { ...show, pagesInputMode: ['json'] },
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
			show: { ...show, pagesInputMode: ['fields'] },
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
		displayOptions: { show },
		routing: {
			request: {
				body: {
					publish: '={{ $value }}',
				},
			},
		},
	},
];
