import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['comment'] };

/**
 * Comment threads on a Gamma.
 *
 * `updatedSince` is the reason this endpoint is well suited to n8n: it lets a
 * scheduled workflow poll for what changed rather than re-reading every thread.
 */
export const commentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get comment threads',
				description: 'Retrieve comment threads on a Gamma, newest first',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/gammas/{{$parameter["commentGammaId"]}}/comments',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Gamma ID',
		name: 'commentGammaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. g_l0mf2jvf1fpmi1v',
		description: 'The Gamma whose comments to read',
		displayOptions: { show },
	},
	{
		displayName: 'Simplify',
		name: 'simplifyComments',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show },
		routing: {
			output: {
				postReceive: [
					{
						// Each thread also carries `targetHtml` (the same quoted text as
						// markup) and a nested `replies` array, which together dwarf the
						// fields most workflows act on.
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							id: '={{ $responseItem.id }}',
							cardId: '={{ $responseItem.cardId }}',
							status: '={{ $responseItem.status }}',
							archived: '={{ $responseItem.archived }}',
							targetText: '={{ $responseItem.targetText }}',
							contentText: '={{ $responseItem.contentText }}',
							authorName: '={{ $responseItem.author ? $responseItem.author.name : null }}',
							replyCount: '={{ $responseItem.replies ? $responseItem.replies.length : 0 }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'commentAdditionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show },
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
				displayName: 'Include Archived',
				name: 'includeArchived',
				type: 'boolean',
				default: false,
				description: 'Whether to include threads that have been archived',
				routing: {
					request: {
						qs: {
							includeArchived: '={{ $value }}',
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
				displayName: 'Updated Since',
				name: 'updatedSince',
				type: 'dateTime',
				default: '',
				description:
					'Only return threads changed after this time. Use it to poll for new activity instead of re-reading everything.',
				routing: {
					request: {
						qs: {
							updatedSince: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
