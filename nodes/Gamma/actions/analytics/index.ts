import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['analytics'] };

/**
 * Engagement analytics for a Gamma.
 *
 * Permissions shape the answer rather than just gating it: every response
 * carries a `scope` of `all` or `self`. With `manage` permission you get the
 * whole workspace's activity; with only `edit` you get your own rows back. A
 * caller who does not know that reads a thin response as a bug, so the
 * operation descriptions say it.
 */
export const analyticsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Cards',
				value: 'getCards',
				action: 'Get card analytics',
				description: 'Per-card view time and viewer reach for every card',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["analyticsGammaId"]}}/analytics/cards',
					},
				},
			},
			{
				name: 'Get Document',
				value: 'getDocument',
				action: 'Get document analytics',
				description: 'Views, unique viewers and editors, and a 30-day daily breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["analyticsGammaId"]}}/analytics',
					},
				},
			},
			{
				name: 'Get Many Viewers',
				value: 'getViewers',
				action: 'Get viewer analytics',
				description:
					'One row per viewer, paginated. Returns every viewer with manage permission, or only your own row with edit.',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["analyticsGammaId"]}}/analytics/viewers',
					},
				},
			},
			{
				name: 'Get Viewer',
				value: 'getViewer',
				action: 'Get viewer detail analytics',
				description: 'One viewer\'s engagement, including time spent on each card',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["analyticsGammaId"]}}/analytics/viewers/{{$parameter["analyticsUserId"]}}',
					},
				},
			},
		],
		default: 'getDocument',
	},
	{
		displayName: 'Gamma ID',
		name: 'analyticsGammaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. g_l0mf2jvf1fpmi1v',
		description:
			'The Gamma to report on. Requires at least edit permission on it, otherwise the API returns 403.',
		displayOptions: { show },
	},
	{
		displayName: 'Viewer ID',
		name: 'analyticsUserId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. usr_abc123',
		description: 'The viewerId from a Get Many Viewers result',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getViewer'],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplifyAnalytics',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getDocument'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						// The headline numbers are eight fields; `dailyViews` adds a
						// 30-entry array that dominates the payload and that most
						// workflows do not read.
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							gammaId: '={{ $responseItem.gammaId }}',
							scope: '={{ $responseItem.scope }}',
							totalViews: '={{ $responseItem.totalViews }}',
							uniqueViewers: '={{ $responseItem.uniqueViewers }}',
							uniqueEditors: '={{ $responseItem.uniqueEditors }}',
							cardCount: '={{ $responseItem.cardCount }}',
							lastOpened: '={{ $responseItem.lastOpened }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'analyticsAdditionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getViewers'],
			},
		},
		options: [
			{
				displayName: 'After Cursor',
				name: 'after',
				type: 'string',
				default: '',
				placeholder: 'e.g. eyJkIjp7ImlkIjoi...',
				description: 'The nextCursor from a previous response, to fetch the following page',
				routing: {
					request: {
						qs: {
							after: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				default: 50,
				description: 'Max number of results to return',
				routing: {
					request: {
						qs: {
							limit: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
				description: 'Order to return viewers in',
				routing: {
					request: {
						qs: {
							sortDirection: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
