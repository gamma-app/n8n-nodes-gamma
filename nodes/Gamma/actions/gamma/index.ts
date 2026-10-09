import type { INodeProperties } from 'n8n-workflow';

import { sendIfSet } from '../sendIfSet';

/** Operations on an existing Gamma, and their parameters. */
export const gammaDescription: INodeProperties[] = [
	// Operations
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['gamma'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive gamma',
				description: 'Archive a Gamma. Repeating this on an archived Gamma succeeds.',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1.0/gammas/{{$parameter["gammaIdentifier"]}}/archive',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete gamma',
				description: 'Delete a Gamma permanently. Requires a workspace admin role.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1.0/gammas/{{$parameter["gammaIdentifier"]}}',
					},
					output: {
						// n8n's UX guidelines ask delete operations to confirm with
						// `deleted: true`; gammaId is kept so the item stays useful
						// to whatever runs next.
						postReceive: [
							{
								type: 'setKeyValue',
								properties: {
									deleted: '={{ true }}',
									gammaId: '={{ $responseItem.gammaId }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Edit',
				value: 'edit',
				action: 'Edit gamma',
				description: 'Have the Gamma 5 agent apply a natural-language edit to one page of a Gamma',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1.0/agent/gammas/{{$parameter["gammaIdentifier"]}}/edits',
					},
				},
			},
			{
				name: 'Export',
				value: 'export',
				action: 'Export gamma',
				description: 'Start an export of an existing Gamma to PDF, PPTX or PNG',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1.0/gammas/{{$parameter["gammaIdentifier"]}}/export',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get gamma',
				description: 'Retrieve metadata for a Gamma',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["gammaIdentifier"]}}',
					},
				},
			},
			{
				name: 'Get Edit Status',
				value: 'getEditStatus',
				action: 'Get edit status',
				description: 'Check the status of an edit',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/agent/edits/{{$parameter["editId"]}}',
					},
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search gammas',
				description: 'Full-text search over the titles and text of the Gammas you can access',
				routing: {
					request: {
						method: 'GET',
						url: '/v1.0/gammas/search',
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'hits' } }],
					},
				},
			}
		],
		default: 'get',
	},
	{
		displayName: 'Gamma ID',
		name: 'gammaIdentifier',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. g_l0mf2jvf1fpmi1v',
		displayOptions: {
			show: {
				resource: ['gamma'],
				operation: ['get', 'export', 'archive', 'delete', 'edit'],
			},
		},
		description:
			'The API file ID, which usually starts with g_. Get, Export and Edit also accept the doc ID from a gamma.app/docs/... URL, but Archive and Delete do not and return 403 for one.',
	},
	// Edit
	{
		displayName: 'Prompt',
		name: 'editPrompt',
		type: 'string',
		required: true,
		typeOptions: { rows: 3 },
		default: '',
		placeholder: 'e.g. Change the title of the first card to Q3 Review',
		description: 'What to change. An edit works on one page and cannot add pages; only one edit runs on a Gamma at a time.',
		displayOptions: { show: { resource: ['gamma'], operation: ['edit'] } },
		routing: { request: { body: { prompt: '={{ $value }}' } } },
	},
	{
		displayName: 'Edit Options',
		name: 'editOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: ['gamma'], operation: ['edit'] } },
		options: [
			{
				displayName: 'Disable Connectors',
				name: 'disableConnectors',
				type: 'boolean',
				default: false,
				description: 'Whether to stop the agent reading the workspace connectors, such as Notion or Slack, for this edit',
				routing: sendIfSet('editOptions.disableConnectors', 'body.disableConnectors'),
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: [
					{ name: 'Default', value: '', description: 'The highest tier your plan allows' },
					{ name: 'Lite', value: 'lite' },
					{ name: 'Max', value: 'max', description: 'Needs a plan that includes it' },
					{ name: 'Standard', value: 'standard' },
				],
				default: '',
				description: 'The quality preset, as offered in the Gamma app',
				routing: sendIfSet('editOptions.quality', 'body.quality'),
			},
		],
	},
	{
		displayName: 'Edit ID',
		name: 'editId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. V1StGXR8Z5jdHi6B',
		description: 'The editId the Edit operation returned',
		displayOptions: { show: { resource: ['gamma'], operation: ['getEditStatus'] } },
	},
	// Search
	{
		displayName: 'Query',
		name: 'searchQuery',
		type: 'string',
		default: '',
		placeholder: 'e.g. climate analytics',
		description: 'Words to match against titles and text. May be empty when a filter is set; results are then newest first.',
		displayOptions: { show: { resource: ['gamma'], operation: ['search'] } },
		routing: sendIfSet('searchQuery', 'qs.q'),
	},
	{
		displayName: 'Filters',
		name: 'searchFilters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: { show: { resource: ['gamma'], operation: ['search'] } },
		options: [
			{
				displayName: 'Created By',
				name: 'createdBy',
				type: 'string',
				default: '',
				placeholder: 'e.g. me',
				description: 'Only Gammas this user created: me, an email address, or a user ID',
				routing: sendIfSet('searchFilters.createdBy', 'qs.createdBy'),
			},
			{
				displayName: 'Include Archived',
				name: 'includeArchived',
				type: 'boolean',
				default: false,
				description: 'Whether to include archived Gammas',
				routing: sendIfSet('searchFilters.includeArchived', 'qs.includeArchived'),
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 25 },
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit -- the API caps search at 25
				default: 10,
				description: 'Max number of results to return',
				routing: sendIfSet('searchFilters.limit', 'qs.limit'),
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
				description: 'Only Gammas last updated at or after this time',
				routing: sendIfSet('searchFilters.updatedAfter', 'qs.updatedAfter'),
			},
			{
				displayName: 'Updated Before',
				name: 'updatedBefore',
				type: 'dateTime',
				default: '',
				description: 'Only Gammas last updated at or before this time',
				routing: sendIfSet('searchFilters.updatedBefore', 'qs.updatedBefore'),
			},
		],
	},
	// Export
	{
		displayName: 'Export As',
		name: 'exportFormat',
		type: 'options',
		required: true,
		options: [
			{ name: 'PDF', value: 'pdf' },
			{ name: 'PNG', value: 'png' },
			{ name: 'PowerPoint (PPTX)', value: 'pptx' },
		],
		default: 'pdf',
		description: 'Format to export to',
		displayOptions: {
			show: {
				resource: ['gamma'],
				operation: ['export'],
			},
		},
		routing: {
			request: {
				body: {
					exportAs: '={{ $value }}',
				},
			},
		},
	},
	// Get
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['gamma'],
				operation: ['get'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							id: '={{ $responseItem.id }}',
							title: '={{ $responseItem.title }}',
							url: '={{ $responseItem.url }}',
							type: '={{ $responseItem.type }}',
							archived: '={{ $responseItem.archived }}',
							updatedTime: '={{ $responseItem.updatedTime }}',
							authorName: '={{ $responseItem.author ? $responseItem.author.name : null }}',
							themeId: '={{ $responseItem.themeId }}',
						},
					},
				],
			},
		},
	},
];
