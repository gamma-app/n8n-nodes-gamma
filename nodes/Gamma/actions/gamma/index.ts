import type { INodeProperties } from 'n8n-workflow';

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
			},
		},
		description:
			'The API file ID, which usually starts with g_. Get and Export also accept the doc ID from a gamma.app/docs/... URL, but Archive and Delete do not and return 403 for one.',
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
