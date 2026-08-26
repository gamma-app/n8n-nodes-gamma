import type { IDataObject, INodeProperties } from 'n8n-workflow';

/** Operations and parameters for the Theme resource. */
export const themeDescription: INodeProperties[] = [
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
					maxValue: 50,
				},
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
								const value = this.getNodeParameter('themeAdditionalFields.query') as string;
								if (value) {
									requestOptions.qs = requestOptions.qs || {};
									(requestOptions.qs as IDataObject).query = value;
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
