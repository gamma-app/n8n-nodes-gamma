import type { INodeProperties } from 'n8n-workflow';

import { sendIfSet } from '../sendIfSet';

/** Operations and parameters for the Folder resource. */
export const folderDescription: INodeProperties[] = [
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
				name: 'folderQuery',
				type: 'string',
				default: '',
				placeholder: 'e.g. marketing',
				description: 'Filter folders by name (case-insensitive)',
				routing: sendIfSet('folderAdditionalFields.folderQuery', 'qs.query'),
			},
		],
	},
];
