import type { INodeProperties } from 'n8n-workflow';

import { imageOperations } from './Image.resource';
import { imageArchiveMediaDescription } from './archiveMedia.operation';
import { imageCreateDescription } from './create.operation';
import { imageGetStatusDescription } from './getStatus.operation';

export const imageDescription: INodeProperties[] = [
	...imageOperations,
	...imageCreateDescription,
	...imageGetStatusDescription,
	...imageArchiveMediaDescription,
];
