import type { INodeProperties } from 'n8n-workflow';

/** Parameters for Image: Get Status. */
export const imageGetStatusDescription: INodeProperties[] = [
	{
		displayName: 'Image Generation ID',
		name: 'imageGenerationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. imggen_abc123',
		description: 'The imageGenerationId returned when the image generation was created',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['getStatus'],
			},
		},
	},
];
