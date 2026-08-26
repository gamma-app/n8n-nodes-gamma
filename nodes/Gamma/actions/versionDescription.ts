import type { INodeProperties } from 'n8n-workflow';

import { resourceDescription } from './resource.description';
import { analyticsDescription } from './analytics';
import { commentDescription } from './comment';
import { generationDescription } from './generation';
import { imageDescription } from './image';
import { themeDescription } from './theme';
import { folderDescription } from './folder';
import { userDescription } from './user';
import { gammaDescription } from './gamma';
import { exportDescription } from './export';

/**
 * Every parameter the node exposes, in display order.
 *
 * Order matters: n8n renders parameters in this sequence, so the resource
 * selector comes first and each resource's block follows. Keep the resources in
 * this order when adding one.
 */
export const properties: INodeProperties[] = [
	...resourceDescription,
	...generationDescription,
	...imageDescription,
	...themeDescription,
	...folderDescription,
	...userDescription,
	...gammaDescription,
	...exportDescription,
	...commentDescription,
	...analyticsDescription,
];
